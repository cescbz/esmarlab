import type { NextAuthConfig } from "next-auth";
import { canAccess, type AppRole } from "@/lib/roles";

export const authConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 12,
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = Boolean(auth?.user);
      const isLoginPage = nextUrl.pathname === "/login";

      if (isLoginPage) {
        if (isLoggedIn) return Response.redirect(new URL("/", nextUrl));
        return true;
      }

      if (nextUrl.pathname.startsWith("/kiosco")) return true;

      if (!isLoggedIn) return false;

      const role = (auth?.user?.role ?? "VENTAS") as AppRole;
      if (!canAccess(role, nextUrl.pathname)) {
        return Response.redirect(new URL("/", nextUrl));
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.username = user.username;
        token.role = user.role;
        token.name = user.name;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? "");
        session.user.username = String(token.username ?? "");
        session.user.role = token.role as AppRole;
        session.user.name = String(token.name ?? session.user.name ?? "");
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
