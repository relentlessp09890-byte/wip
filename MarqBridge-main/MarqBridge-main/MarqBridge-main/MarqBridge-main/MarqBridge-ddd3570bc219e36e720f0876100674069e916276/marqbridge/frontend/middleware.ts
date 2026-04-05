import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only intercept the root path
  if (pathname !== '/') return NextResponse.next()

  // Check if user has seen landing via cookie
  // (localStorage is not available in middleware — use cookies)
  const sawLanding  = request.cookies.get('marq_saw_landing')?.value
  const onboarded   = request.cookies.get('marq_onboarded')?.value

  if (!sawLanding) {
    // First visit ever — redirect to landing page
    return NextResponse.redirect(new URL('/landing', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!landing|auth|api|_next|favicon|icon|manifest|sw).*)'],
}