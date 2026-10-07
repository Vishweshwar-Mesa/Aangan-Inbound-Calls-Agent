import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

// Neon has no row-level security, so page access is gated here instead: only
// a signed-in session (whose email already passed the ALLOWED_EMAILS check
// in lib/auth.ts) can reach anything outside /login. API routes handle their
// own auth per endpoint (webhook secrets, cron secret) and are not gated here.
export default auth((req) => {
  const isLoggedIn = Boolean(req.auth);
  const isLoginPage = req.nextUrl.pathname.startsWith("/login");

  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
