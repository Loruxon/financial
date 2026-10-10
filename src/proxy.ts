import { NextResponse, type NextRequest } from "next/server";
import { MOCK_USER_COOKIE } from "@/modules/auth/constants";

/** Проверяет только наличие сессии (раздел 7 target-design.md). */
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(MOCK_USER_COOKIE);
  const isPublicPath =
    request.nextUrl.pathname === "/login" ||
    request.nextUrl.pathname.startsWith("/dev/");

  if (!hasSession && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
