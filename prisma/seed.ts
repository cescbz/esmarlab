import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const users: { username: string; name: string; role: Role }[] = [
  { username: "admin", name: "Ana Giménez", role: "ADMIN" },
  { username: "gerencia", name: "Roberto Esmar", role: "GERENCIA" },
  { username: "ventas", name: "Lucía Benítez", role: "VENTAS" },
  { username: "caja", name: "Mabel Ortiz", role: "CAJA" },
  { username: "deposito", name: "Hugo Villalba", role: "DEPOSITO" },
  { username: "produccion", name: "Diego Ayala", role: "PRODUCCION" },
];

async function main() {
  const passwordHash = await bcrypt.hash("demo1234", 10);
  for (const user of users) {
    await prisma.user.upsert({
      where: { username: user.username },
      update: { name: user.name, role: user.role, passwordHash, active: true },
      create: { ...user, passwordHash, active: true },
    });
  }
  console.log(`Usuarios demo listos: ${users.map((u) => u.username).join(", ")}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
