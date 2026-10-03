// SPDX-License-Identifier: AGPL-3.0-or-later
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthStaleWriteError } from '../lib/api';
import { beginLink, finishLink, identities, type Identity, linkableProviders, unlink } from './link';
import { PENDING_OAUTH_KEY } from './pending';

const SERVER = 'https://app.example.com/api';
const OAUTH = `${SERVER}/v1/auth/oauth`;
const HTTP_OK = 200;
const HTTP_NO_CONTENT = 204;
const HTTP_PRECONDITION_FAILED = 412;
const LINKED_AT = '2026-10-03T09:00:00.000001';

const json = (body: object, status = HTTP_OK): Response => new Response(JSON.stringify(body), { status });

const serve = (...responses: Response[]): ReturnType<typeof vi.fn<typeof fetch>> => {
  const fetchMock = vi.fn<typeof fetch>();
  for (const response of responses) {
    fetchMock.mockResolvedValueOnce(response);
  }
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

const google: Identity = {
  id: 'i1',
  provider_instance_id: 'pi-google',
  provider: 'google',
  email: 'ada@example.com',
  created_at: LINKED_AT,
};

describe('account linking', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('offers the providers the server is configured for', async () => {
    const fetchMock = serve(
      json({ providers: [{ name: 'google', provider: 'google', friendly_name: 'Google', kind: 'oidc' }] }),
    );
    await expect(linkableProviders(SERVER)).resolves.toEqual([
      { name: 'google', provider: 'google', friendly_name: 'Google' },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(`${OAUTH}/providers`, expect.anything());
  });

  it('lists the caller’s linked identities', async () => {
    const fetchMock = serve(json({ o_auth_identities: [{ ...google, subject: 'g-123' }] }));
    await expect(identities(SERVER)).resolves.toEqual([google]);
    expect(fetchMock).toHaveBeenCalledWith(`${OAUTH}/identity?offset=0&limit=100`, expect.anything());
  });

  it('starts a link at the server’s authorize URL, remembering the provider and state', async () => {
    const fetchMock = serve(json({ authorize_url: 'https://accounts.google.com/o/oauth2/auth?state=s1', state: 's1' }));
    await expect(beginLink(SERVER, 'google', sessionStorage)).resolves.toBe(
      'https://accounts.google.com/o/oauth2/auth?state=s1',
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `${OAUTH}/link/authorize`,
      expect.objectContaining({ method: 'POST', body: '{"provider":"google"}' }),
    );
    expect(JSON.parse(sessionStorage.getItem(PENDING_OAUTH_KEY) ?? '')).toEqual({
      kind: 'link',
      provider: 'google',
      state: 's1',
    });
  });

  it('finishes a link with the returned code and state', async () => {
    const fetchMock = serve(json(google));
    await finishLink(SERVER, 'google', 'c1', 's1');
    expect(fetchMock).toHaveBeenCalledWith(
      `${OAUTH}/link/callback`,
      expect.objectContaining({ method: 'POST', body: '{"provider":"google","code":"c1","state":"s1"}' }),
    );
  });

  it('unlinks an identity, guarded by the version it was loaded at', async () => {
    const fetchMock = serve(new Response(null, { status: HTTP_NO_CONTENT }));
    await unlink(SERVER, google);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(`${OAUTH}/identity/i1`);
    expect(init?.method).toBe('DELETE');
    expect(new Headers(init?.headers).get('If-Match')).toBe(`"${LINKED_AT}"`);
  });

  it('refuses to unlink an identity that changed since it was loaded', async () => {
    serve(json({ detail: 'The record was changed since it was read' }, HTTP_PRECONDITION_FAILED));
    await expect(unlink(SERVER, google)).rejects.toBeInstanceOf(AuthStaleWriteError);
  });
});
