"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2, LockKeyhole, UserRound, Eye, EyeOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ROLE_LABELS, type AppRole } from "@/lib/roles";

const DEMO_USERS: { username: string; name: string; role: AppRole }[] = [
  { username: "admin", name: "Ana Giménez", role: "ADMIN" },
  { username: "gerencia", name: "Roberto Esmar", role: "GERENCIA" },
  { username: "ventas", name: "Lucía Benítez", role: "VENTAS" },
  { username: "caja", name: "Mabel Ortiz", role: "CAJA" },
  { username: "deposito", name: "Hugo Villalba", role: "DEPOSITO" },
  { username: "produccion", name: "Diego Ayala", role: "PRODUCCION" },
];

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!username.trim() || !password) {
      setError("Ingresá usuario y contraseña.");
      return;
    }

    setLoading(true);
    try {
      const result = await signIn("credentials", {
        username: username.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (!result || result.error) {
        setError("Usuario o contraseña incorrectos. Verificá los datos e intentá de nuevo.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("No pudimos iniciar sesión. Intentá nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  function fillDemoUser(user: { username: string; role: AppRole }) {
    setUsername(user.username);
    setPassword("demo1234");
    setError("");
  }

  return (
    <div className="mt-7">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="username">Usuario</Label>
          <div className="relative">
            <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="username"
              autoComplete="username"
              autoCapitalize="none"
              placeholder="tu.usuario"
              className="h-11 pl-9"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Contraseña</Label>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              className="h-11 pl-9 pr-10"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error ? (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <Button type="submit" className="h-11 w-full text-sm font-semibold" disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Ingresar al sistema
        </Button>
      </form>

      <div className="mt-7 border-t border-border/80 pt-5">
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Usuarios de demo
          </p>
          <p className="text-[11px] text-muted-foreground">
            Contraseña: <span className="font-mono font-medium text-foreground">demo1234</span>
          </p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {DEMO_USERS.map((user) => (
            <button
              key={user.username}
              type="button"
              onClick={() => fillDemoUser(user)}
              className={cn(
                "group flex flex-col rounded-lg border px-3 py-2 text-left transition-all",
                username === user.username
                  ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                  : "border-border bg-white hover:border-primary/30 hover:bg-secondary/40"
              )}
            >
              <span className="text-xs font-semibold text-foreground">{user.name}</span>
              <span className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                {ROLE_LABELS[user.role]} · {user.username}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          Elegí un usuario para completar las credenciales.
        </p>
      </div>
    </div>
  );
}
