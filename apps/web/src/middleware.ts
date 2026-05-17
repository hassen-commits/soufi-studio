import { NextResponse, type NextRequest } from "next/server";

/**
 * Protège /admin/* derrière un cookie `admin_session` dont la valeur doit
 * matcher la variable d'env ADMIN_TOKEN. Le cookie est posé par la server
 * action /admin/login.
 *
 * /admin/login lui-même est exempt pour permettre l'authentification.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Page login + son endpoint : pas d'auth requise
  if (
    pathname === "/admin/login" ||
    pathname === "/admin/api/login" ||
    pathname === "/admin/api/logout"
  ) {
    return NextResponse.next();
  }

  const expected = process.env.ADMIN_TOKEN;
  // Si ADMIN_TOKEN n'est pas défini, on laisse passer (pour dev local
  // sans setup). En prod il DOIT être défini.
  if (!expected) return NextResponse.next();

  const cookie = req.cookies.get("admin_session")?.value;
  if (cookie === expected) return NextResponse.next();

  const loginUrl = new URL("/admin/login", req.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*"],
};
