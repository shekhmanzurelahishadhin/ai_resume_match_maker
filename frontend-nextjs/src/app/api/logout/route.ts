// POST /api/logout — clears the NextAuth session cookie.
//
// For browser clients the recommended flow is `signOut()` from next-auth/react,
// which calls this endpoint internally via /api/auth/signout. We provide a REST
// alias here so non-browser clients can clear their cookie too.

import { ok } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST() {
  const res = ok({ loggedOut: true });
  // Clear the NextAuth session cookie. The exact name depends on whether we're
  // in HTTPS + production (uses __Secure-prefix). We clear both variants to be safe.
  const cookiesToClear = [
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
    "next-auth.callback-url",
    "__Secure-next-auth.callback-url",
    "next-auth.csrf-token",
  ];
  for (const name of cookiesToClear) {
    res.cookies.set(name, "", { maxAge: 0, path: "/" });
  }
  return res;
}
