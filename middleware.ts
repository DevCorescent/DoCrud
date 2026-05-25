import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect unauthenticated users away from the home feed before Next.js
  // compiles the heavy PublicHomepage module graph. Cookie-only check —
  // no network calls, no heavy imports.
  if (pathname === '/') {
    const hasSession =
      request.cookies.has('next-auth.session-token') ||
      request.cookies.has('__Secure-next-auth.session-token');
    const isGuest = request.cookies.get('guestMode')?.value === '1';

    if (!hasSession && !isGuest) {
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }
  }

  return NextResponse.next({ request: { headers: request.headers } });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
