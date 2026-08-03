// NextAuth.js v4 configuration — Credentials provider, JWT session strategy.
//
// Sessions are stateless (JWT) so the API can scale horizontally without
// hitting the DB on every request. The JWT callback attaches `role` and `id`
// so route handlers can authorize without an extra DB lookup.

import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { db } from "@/lib/db";
import { BCRYPT_ROUNDS, JWT_SESSION_MAX_AGE_SECONDS } from "@/lib/constants";

// Re-export bcrypt hash helper so auth route handlers don't need to import
// bcrypt directly (keeps the bcrypt version pinned in one place).
export const hashPassword = (plain: string) =>
  bcrypt.hash(plain, BCRYPT_ROUNDS);

export const verifyPassword = (plain: string, hash: string) =>
  bcrypt.compare(plain, hash);

export const authOptions: NextAuthOptions = {
  // We use JWT (stateless) sessions — no database adapter needed.
  session: {
    strategy: "jwt",
    maxAge: JWT_SESSION_MAX_AGE_SECONDS,
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password ?? "";
        if (!email || !password) return null;

        const user = await db.user.findUnique({ where: { email } });
        if (!user) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        } as { id: string; name: string; email: string; role: string };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // `user` is what authorize() returned on first sign-in.
        const u = user as { id: string; role: string };
        token.id = u.id;
        token.role = u.role;
      }
      return token;
    },
    async session({ session, token }) {
      // Expose id + role on session.user so route handlers can authorize.
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string | undefined;
        (session.user as { role?: string }).role = token.role as
          | string
          | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  // Secret read from env at runtime — fails fast if missing.
  secret: process.env.NEXTAUTH_SECRET,
};
