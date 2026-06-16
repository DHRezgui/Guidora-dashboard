const LEGACY_STORAGE_KEY = 'trustdev.sdk-token-plaintext-pending';

export const SDK_TOKEN_PLAINTEXT_VISIBILITY_MS = 10 * 60 * 1000;

export type SdkTokenPlaintextSession = {
  token: string;
  tokenId?: string;
  expiresAt: number;
  copied: boolean;
};

/** Mémoire volatile uniquement — jamais rechargée après F5 (pas de sessionStorage). */
let memorySession: SdkTokenPlaintextSession | null = null;

function purgeLegacySessionStorage(): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.sessionStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

if (typeof window !== 'undefined') {
  purgeLegacySessionStorage();
}

export function readSdkTokenPlaintextSession(nowMs: number = Date.now()): SdkTokenPlaintextSession | null {
  if (!memorySession) {
    return null;
  }
  if (memorySession.expiresAt <= nowMs) {
    memorySession = null;
    return null;
  }
  return memorySession;
}

export function clearSdkTokenPlaintextSession(): void {
  memorySession = null;
  purgeLegacySessionStorage();
}

export function plaintextSessionMatchesRevokedToken(
  session: SdkTokenPlaintextSession,
  tokenId?: string,
  tokenSuffix?: string,
): boolean {
  if (tokenId && session.tokenId === tokenId) {
    return true;
  }
  if (tokenSuffix && session.token.endsWith(tokenSuffix)) {
    return true;
  }
  return false;
}

export function startSdkTokenPlaintextSession(
  token: string,
  tokenId?: string,
  nowMs: number = Date.now(),
): SdkTokenPlaintextSession {
  purgeLegacySessionStorage();
  memorySession = {
    token,
    tokenId,
    expiresAt: nowMs + SDK_TOKEN_PLAINTEXT_VISIBILITY_MS,
    copied: false,
  };
  return memorySession;
}

export function markSdkTokenPlaintextCopied(
  nowMs: number = Date.now(),
): SdkTokenPlaintextSession | null {
  const session = readSdkTokenPlaintextSession(nowMs);
  if (!session) {
    return null;
  }
  memorySession = { ...session, copied: true };
  return memorySession;
}

export function getSdkTokenPlaintextRemainingMs(
  session: SdkTokenPlaintextSession,
  nowMs: number = Date.now(),
): number {
  return Math.max(0, session.expiresAt - nowMs);
}

export function formatSdkTokenPlaintextRemaining(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}
