import { afterEach, describe, expect, it } from 'vitest';
import {
  clearSdkTokenPlaintextSession,
  readSdkTokenPlaintextSession,
  startSdkTokenPlaintextSession,
} from './sdk-token-plaintext-session';

const LEGACY_STORAGE_KEY = 'trustdev.sdk-token-plaintext-pending';

describe('sdk-token-plaintext-session', () => {
  afterEach(() => {
    clearSdkTokenPlaintextSession();
  });

  it('does not persist plaintext in sessionStorage', () => {
    startSdkTokenPlaintextSession('td_sdk_test_secret', 'token-id-1');
    expect(sessionStorage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
  });

  it('clears plaintext after simulated page reload (new module read)', () => {
    startSdkTokenPlaintextSession('td_sdk_test_secret', 'token-id-1');
    clearSdkTokenPlaintextSession();
    expect(readSdkTokenPlaintextSession()).toBeNull();
  });

  it('expires plaintext after visibility window', () => {
    const now = Date.now();
    startSdkTokenPlaintextSession('td_sdk_test_secret', 'token-id-1', now);
    expect(readSdkTokenPlaintextSession(now + 10 * 60 * 1000 + 1)).toBeNull();
  });
});
