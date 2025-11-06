// middleware.ts
import { NextResponse, NextRequest } from 'next/server';

const PUBLIC_PAGES = new Set(['/login', '/favicon.ico']);
const PUBLIC_APIS  = new Set(['/api/sessionLogin', '/api/sessionLogout', '/api/health']);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/assets') ||
    pathname.startsWith('/public') ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  ) return NextResponse.next();

  if (pathname.startsWith('/api')) {
    if (PUBLIC_APIS.has(pathname)) return NextResponse.next();
    if (!req.cookies.get('__session')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (PUBLIC_PAGES.has(pathname)) {
    if (req.cookies.get('__session') && pathname === '/login') {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }

  if (!req.cookies.get('__session')) {
    const url = new URL('/login', req.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/((?!_next/|assets/|public/|favicon.ico|.*\\..*).*)'] };
