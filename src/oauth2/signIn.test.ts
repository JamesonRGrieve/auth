// SPDX-License-Identifier: AGPL-3.0-or-later
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PENDING_OAUTH_KEY } from './pending';
import { beginSignIn, finishSignIn } from './signIn';

const SERVER = 'https://app.example.com/api';
const HTTP_OK = 200;
const HTTP_BAD_REQUEST = 400;

describe('OAuth sign-in', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts at the authorize URL the server issues, remembering the provider and state', async () => {
    const fetchMock = vi.fn(async () =>
      Promise.resolve(
        new Response(
          JSON.stringify({ authorize_url: 'https://accounts.google.com/o/oauth2/v2/auth?state=s1', state: 's1' }),
          {
            status: HTTP_OK,
          },
        ),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    await expect(beginSignIn(SERVER, 'google', sessionStorage)).resolves.toBe(
      'https://accounts.google.com/o/oauth2/v2/auth?state=s1',
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `${SERVER}/v1/auth/oauth/authorize`,
      expect.objectContaining({ method: 'POST', body: '{"provider":"google"}', credentials: 'same-origin' }),
    );
    expect(JSON.parse(sessionStorage.getItem(PENDING_OAUTH_KEY) ?? '')).toEqual({
      kind: 'signIn',
      provider: 'google',
      state: 's1',
    });
  });

  it('finishes with the returned code and state on the browser’s binding cookie', async () => {
    const fetchMock = vi.fn(async () => Promise.resolve(new Response('{"session_key":"k"}', { status: HTTP_OK })));
    vi.stubGlobal('fetch', fetchMock);
    await finishSignIn(SERVER, 'google', 'c1', 's1');
    expect(fetchMock).toHaveBeenCalledWith(
      `${SERVER}/v1/auth/oauth/callback`,
      expect.objectContaining({
        method: 'POST',
        body: '{"provider":"google","code":"c1","state":"s1"}',
        credentials: 'same-origin',
      }),
    );
  });

  it('raises the server’s reason for a refused callback', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Promise.resolve(new Response('{"detail":"Invalid or expired OAuth state"}', { status: HTTP_BAD_REQUEST })),
      ),
    );
    await expect(finishSignIn(SERVER, 'google', 'c1', 's1')).rejects.toThrow('Invalid or expired OAuth state');
  });
});
