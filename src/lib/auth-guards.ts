import { auth } from "@/auth";
import type { AppRole } from "@/lib/roles";

export class AuthError extends Error {
  constructor(message = "No tenés permiso para realizar esta acción.") {
    super(message);
    this.name = "AuthError";
  }
}

export async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new AuthError("Tu sesión expiró. Volvé a iniciar sesión.");
  return session;
}

export async function requireRole(...roles: AppRole[]) {
  const session = await requireSession();
  if (!roles.includes(session.user.role)) {
    throw new AuthError("Tu rol no tiene permiso para realizar esta acción.");
  }
  return session;
}
