// SPDX-License-Identifier: AGPL-3.0-or-later
// An OAuth round trip in flight. The provider's redirect carries only `code` and `state`, so the
// browser remembers what it started (a sign-in or an account link, and for which provider) until
// the close page takes it back, matched on `state`.
import { z } from 'zod';

export const PENDING_OAUTH_KEY = 'zx_oauth_pending';

const PendingOAuthSchema = z.object({
  kind: z.enum(['signIn', 'link']),
  provider: z.string(),
  state: z.string(),
});
export type PendingOAuth = z.infer<typeof PendingOAuthSchema>;

export function rememberPending(storage: Storage, pending: PendingOAuth): void {
  storage.setItem(PENDING_OAUTH_KEY, JSON.stringify(pending));
}

const readPending = (storage: Storage): PendingOAuth | null => {
  const raw = storage.getItem(PENDING_OAUTH_KEY);
  if (raw === null) {
    return null;
  }
  try {
    const parsed = PendingOAuthSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

/**
 * The round trip `params` returns from, with its `code`, once: null when it has no code or its
 * state isn't the one this browser is waiting for.
 */
export function takePending(storage: Storage, params: URLSearchParams): (PendingOAuth & { code: string }) | null {
  const code = params.get('code');
  const state = params.get('state');
  const pending = readPending(storage);
  if (code === null || code === '' || state === null || pending?.state !== state) {
    return null;
  }
  storage.removeItem(PENDING_OAUTH_KEY);
  return { ...pending, code };
}
