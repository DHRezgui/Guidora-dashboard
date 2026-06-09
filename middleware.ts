import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** Normalise les variantes « sdk tests » → sdk-tests (404 fréquent pendant les tests lab). */
function normalizeSdkLabPathname(pathname: string): string {
	return pathname
		.replace(/\/sdk%20tests\b/gi, '/sdk-tests')
		.replace(/\/sdk tests\b/gi, '/sdk-tests');
}

export function middleware(request: NextRequest) {
	const { pathname, search } = request.nextUrl;
	const normalized = normalizeSdkLabPathname(pathname);

	if (normalized !== pathname) {
		const url = request.nextUrl.clone();
		url.pathname = normalized;
		return NextResponse.redirect(url);
	}

	return NextResponse.next();
}

export const config = {
	matcher: ['/dashboard/:path*'],
};
