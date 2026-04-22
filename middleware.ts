import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const pathname = request.nextUrl.pathname;

  // Routes publiques (pas besoin d'auth)
  const publicRoutes = ['/login', '/forgot-password', '/reset-password', '/verify-email', '/api'];

  // Vérifier si la route est publique
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // NOTE:
  // The dashboard auth source of truth is localStorage (client side).
  // A strict cookie-only redirect here can incorrectly block valid sessions
  // after reloads/domain changes and surface as route issues.
  // Client layout still enforces auth and redirects to /login when needed.
  if (!token && !isPublicRoute) {
    return NextResponse.next();
  }

  // Exceptions pour les routes publiques accessibles même si connecté
  const routesAccessiblesSiConnecte = ['/verify-email'];
  const isAccessibleSiConnecte = routesAccessiblesSiConnecte.some(route => pathname.startsWith(route));

  // Si token et route publique (sauf login et exceptions) → rediriger vers dashboard
  if (token && isPublicRoute && pathname !== '/api' && pathname !== '/login' && !isAccessibleSiConnecte) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};