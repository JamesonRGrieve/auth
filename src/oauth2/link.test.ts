// SPDX-License-Identifier: AGPL-3.0-or-later
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { beginLink, connections, finishLink, linkableProviders, unlink } from './link';
import { PENDING_OAUTH_KEY } from './pending';

const SERVER = 'https://app.example.com/api';
const HTTP_OK = 200;

const json = (body: object): Response => new Response(JSON.stringify(body), { status: HTTP_OK });

const serve = (...responses: Response[]): ReturnType<typeof vi.fn> => {
  const fetchMock = vi.fn();
  for (const response of responses) {
    fetchMock.mockResolvedValueOnce(response);
  }
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

describe('account linking', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('offers only the providers the server has credentials for', async () => {
    serve(
      json({
        providers: [
          { name: 'google', configured: true },
          { name: 'github', configured: false },
        ],
      }),
    );
    await expect(linkableProviders(SERVER)).resolves.toEqual(['google']);
  });

  it('lists the caller’s linked accounts', async () => {
    const fetchMock = serve(json({ connections: [{ provider: 'google', account_email: 'ada@example.com' }] }));
    await expect(connections(SERVER)).resolves.toEqual([{ provider: 'google', account_email: 'ada@example.com' }]);
    expect(fetchMock).toHaveBeenCalledWith(`${SERVER}/v1/oauth2_client/connections`, expect.anything());
  });

  it('starts a link at the server’s authorize URL, remembering the provider and state', async () => {
    serve(json({ authorize_url: 'https://accounts.google.com/o/oauth2/auth?state=s1', state: 's1' }));
    await expect(beginLink(SERVER, 'google', sessionStorage)).resolves.toBe(
      'https://accounts.google.com/o/oauth2/auth?state=s1',
    );
    expect(JSON.parse(sessionStorage.getItem(PENDING_OAUTH_KEY) ?? '')).toEqual({
      kind: 'link',
      provider: 'google',
      state: 's1',
    });
  });

  it('finishes a link with the returned code and state', async () => {
    const fetchMock = serve(json({ linked: true, provider: 'google' }));
    await finishLink(SERVER, 'google', 'c1', 's1');
    expect(fetchMock).toHaveBeenCalledWith(
      `${SERVER}/v1/oauth2_client/callback/google`,
      expect.objectContaining({ method: 'POST', body: '{"code":"c1","state":"s1"}' }),
    );
  });

  it('unlinks a provider', async () => {
    const fetchMock = serve(json({ disconnected: true }));
    await unlink(SERVER, 'google');
    expect(fetchMock).toHaveBeenCalledWith(
      `${SERVER}/v1/oauth2_client/disconnect/google`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
