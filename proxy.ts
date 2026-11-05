import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/namespaces") || pathname.startsWith("/account")) {
    if (!req.auth) {
      const loginUrl = new URL("/login", req.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/dashboard/:path*", "/namespaces/:path*", "/account/:path*"],
}
