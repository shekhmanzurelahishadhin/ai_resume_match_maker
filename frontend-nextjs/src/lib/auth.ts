// NextAuth.js v4 configuration — Credentials provider, JWT session strategy.
//
// Authentication is delegated to the Laravel API (README §3, "Option A"):
// `authorize()` POSTs to `${API}/login` and keeps the returned Sanctum token in
// the NextAuth JWT. The token stays server-side — the API proxy reads it from
// the session and attaches it to every forwarded request, so it is never
// exposed to browser JavaScript.

import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { apiUrl } from "@/lib/api-config";
import { JWT_SESSION_MAX_AGE_SECONDS } from "@/lib/constants";

interface LaravelLoginResponse {
  data?: {
    user?: { id: string; name: string; email: string; role: string };
    token?: string;
  };
  error?: { message?: string };
}

export const authOptions: NextAuthOptions = {
  // JWT (stateless) sessions — the Laravel token rides along inside the JWT.
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

        let payload: LaravelLoginResponse;
        try {
          const res = await fetch(apiUrl("login"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({ email, password }),
          });
          payload = (await res.json()) as LaravelLoginResponse;
          if (!res.ok) {
            // 401 on bad credentials is expected; anything else is worth logging.
            if (res.status !== 401) {
              console.warn(
                JSON.stringify({
                  level: "warn",
                  event: "login_upstream_error",
                  status: res.status,
                  message: payload?.error?.message,
                }),
              );
            }
            return null;
          }
        } catch (e) {
          console.error(
            JSON.stringify({
              level: "error",
              event: "login_request_failed",
              error: e instanceof Error ? e.message : String(e),
            }),
          );
          return null;
        }

        const user = payload.data?.user;
        const token = payload.data?.token;
        if (!user?.id || !token) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          apiToken: token,
        } as {
          id: string;
          name: string;
          email: string;
          role: string;
          apiToken: string;
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // `user` is what authorize() returned on first sign-in.
        const u = user as { id: string; role: string; apiToken: string };
        token.id = u.id;
        token.role = u.role;
        token.apiToken = u.apiToken;
      }
      return token;
    },
    async session({ session, token }) {
      // Expose id + role on session.user. The Laravel token is deliberately
      // NOT copied onto the session — see `getApiToken()` below.
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
