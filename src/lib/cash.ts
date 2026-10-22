import { prisma } from "@/lib/prisma";

export async function getSessionSummary(sessionId: string) {
  const session = await prisma.cashSession.findUnique({
    where: { id: sessionId },
    include: {
      cashRegister: { include: { expeditionPoint: true } },
      movements: { include: { paymentMethod: true } },
    },
  });
  if (!session) return null;

  const methods = await prisma.paymentMethod.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  const totals = new Map<string, { inbound: number; outbound: number }>();
  for (const movement of session.movements) {
    const current = totals.get(movement.paymentMethodId) ?? { inbound: 0, outbound: 0 };
    if (movement.type === "EGRESO_GASTO" || movement.type === "RETIRO") {
      current.outbound += movement.amount;
    } else {
      current.inbound += movement.amount;
    }
    totals.set(movement.paymentMethodId, current);
  }

  const rows = methods.map((method) => {
    const current = totals.get(method.id) ?? { inbound: 0, outbound: 0 };
    const expected =
      current.inbound -
      current.outbound +
      (method.type === "EFECTIVO" ? session.openingAmount : 0);
    return {
      methodId: method.id,
      name: method.name,
      type: method.type,
      expected,
      inbound: current.inbound,
      outbound: current.outbound,
    };
  });

  return {
    session,
    methods,
    rows,
    totalExpected: rows.reduce((sum, row) => sum + row.expected, 0),
    cashExpected: rows.find((row) => row.type === "EFECTIVO")?.expected ?? 0,
  };
}
