import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3020/api/v1').replace(
  /\/$/,
  '',
);

type CachedSession = {
  token: string;
  expiresAtMs: number;
};

let cachedSession: CachedSession | null = null;

/**
 * BFF route: exchanges server-side PAT for a short-lived browser session (`td_sess_...`).
 * Configure `TRUSTDEV_SDK_TOKEN` (sans NEXT_PUBLIC) sur le serveur Next.js.
 *
 * Requires a valid dashboard JWT (`auth_token` cookie) so anonymous callers cannot mint sessions.
 * Lab default still uses `NEXT_PUBLIC_TRUSTDEV_SDK_TOKEN` and does not need this route.
 */
export async function GET() {
  const cookieStore = await cookies();
  const authToken = cookieStore.get('auth_token')?.value?.trim();
  if (!authToken) {
    return NextResponse.json({ error: 'Authentification dashboard requise.' }, { status: 401 });
  }

  const profileResponse = await fetch(`${API_URL}/auth/profile`, {
    headers: { Authorization: `Bearer ${authToken}` },
    cache: 'no-store',
  });
  if (!profileResponse.ok) {
    return NextResponse.json({ error: 'Session dashboard invalide ou expirée.' }, { status: 401 });
  }

  const pat = process.env.TRUSTDEV_SDK_TOKEN?.trim();
  if (!pat?.startsWith('td_sdk_')) {
    return NextResponse.json(
      {
        error:
          'TRUSTDEV_SDK_TOKEN manquant ou invalide côté serveur. Utilisez un PAT td_sdk_... (jamais NEXT_PUBLIC en prod).',
      },
      { status: 503 },
    );
  }

  const now = Date.now();
  if (cachedSession && cachedSession.expiresAtMs - 60_000 > now) {
    return NextResponse.json({
      sessionToken: cachedSession.token,
      expiresAt: new Date(cachedSession.expiresAtMs).toISOString(),
      cached: true,
    });
  }

  const response = await fetch(`${API_URL}/auth/sdk-tokens/exchange`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${pat}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text();
    return NextResponse.json(
      { error: text || 'Échange PAT → session impossible' },
      { status: response.status },
    );
  }

  const payload = (await response.json()) as {
    sessionToken: string;
    expiresAt: string;
    expiresIn: number;
    scopes: string[];
  };

  cachedSession = {
    token: payload.sessionToken,
    expiresAtMs: new Date(payload.expiresAt).getTime(),
  };

  return NextResponse.json({
    sessionToken: payload.sessionToken,
    expiresAt: payload.expiresAt,
    expiresIn: payload.expiresIn,
    scopes: payload.scopes,
    cached: false,
  });
}
