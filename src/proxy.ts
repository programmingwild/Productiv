import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const publicRoutes = ["/login", "/signup", "/api/auth", "/api/webhooks", "/api/razorpay/webhook"]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))
  if (isPublicRoute) return NextResponse.next()

  const hostname = request.headers.get("host") ?? ""
  const isLocalhost = hostname.includes("localhost") || hostname.includes("127.0.0.1")

  if (isLocalhost) {
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set("x-tenant-slug", "main")
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  const subdomain = hostname.split(".")[0]
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-tenant-slug", subdomain)
  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
}
