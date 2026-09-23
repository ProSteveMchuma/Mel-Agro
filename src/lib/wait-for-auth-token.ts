'use client';

import { getAuth, onAuthStateChanged } from 'firebase/auth';

/**
 * Wait briefly for Firebase Auth to hydrate currentUser before fetching
 * protected resources (e.g. opening /orders/[id]/receipt in a new tab).
 */
export function waitForAuthToken(timeoutMs = 8_000): Promise<string | null> {
  const auth = getAuth();
  if (auth.currentUser) {
    return auth.currentUser.getIdToken().catch(() => null);
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (token: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unsub();
      resolve(token);
    };

    const timer = setTimeout(() => finish(null), timeoutMs);
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // Auth finished hydrating with no user — still useful for token links.
        finish(null);
        return;
      }
      try {
        finish(await user.getIdToken());
      } catch {
        finish(null);
      }
    });
  });
}
