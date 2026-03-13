import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const pathname = request.nextUrl.pathname;

  // Routes publiques (pas besoin d'auth)
  const publicRoutes = ['/login', '/forgot-password', '/reset-password', '/verify-email', '/api'];

  // Vérifier si la route est publique
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // Si pas de token et route privée → rediriger vers login
  if (!token && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Exceptions pour les routes publiques accessibles même si connecté
  const routesAccessiblesSiConnecte = ['/verify-email'];
  const isAccessibleSiConnecte = routesAccessiblesSiConnecte.some(route => pathname.startsWith(route));

  // Si token et route publique (sauf exceptions) → rediriger vers dashboard
  if (token && isPublicRoute && pathname !== '/api' && !isAccessibleSiConnecte) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};