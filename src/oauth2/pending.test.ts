// SPDX-License-Identifier: AGPL-3.0-or-later
import { beforeEach, describe, expect, it } from 'vitest';
import { PENDING_OAUTH_KEY, rememberPending, takePending } from './pending';

describe('pending OAuth round trips', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('hands back what this browser started, with the code, once', () => {
    rememberPending(sessionStorage, { kind: 'signIn', provider: 'google', state: 's1' });
    expect(takePending(sessionStorage, new URLSearchParams('code=c1&state=s1'))).toEqual({
      kind: 'signIn',
      provider: 'google',
      state: 's1',
      code: 'c1',
    });
    expect(sessionStorage.getItem(PENDING_OAUTH_KEY)).toBeNull();
    expect(takePending(sessionStorage, new URLSearchParams('code=c1&state=s1'))).toBeNull();
  });

  it('ignores a return it did not start, a foreign state, or a missing code', () => {
    expect(takePending(sessionStorage, new URLSearchParams('code=c1&state=s1'))).toBeNull();
    rememberPending(sessionStorage, { kind: 'link', provider: 'github', state: 's1' });
    expect(takePending(sessionStorage, new URLSearchParams('code=c1&state=forged'))).toBeNull();
    expect(takePending(sessionStorage, new URLSearchParams('state=s1'))).toBeNull();
    expect(sessionStorage.getItem(PENDING_OAUTH_KEY)).not.toBeNull();
  });

  it('ignores a corrupt or foreign entry', () => {
    const params = new URLSearchParams('code=c1&state=s1');
    sessionStorage.setItem(PENDING_OAUTH_KEY, 'not json');
    expect(takePending(sessionStorage, params)).toBeNull();
    sessionStorage.setItem(PENDING_OAUTH_KEY, JSON.stringify({ kind: 'other', provider: 'x', state: 's1' }));
    expect(takePending(sessionStorage, params)).toBeNull();
  });
});
