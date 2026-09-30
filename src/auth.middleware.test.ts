// SPDX-License-Identifier: AGPL-3.0-or-later
import { NextRequest } from 'next/server.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAuthMiddleware } from './auth.middleware';

const ORIGIN = 'https://app.example.com';
const API = 'http://api.internal:8000';
const HTTP_OK = 200;
const HTTP_UNAUTHORIZED = 401;
const HTTP_PAYMENT_REQUIRED = 402;
const HTTP_FORBIDDEN = 403;
const HTTP_UNAVAILABLE = 503;

const guard = createAuthMiddleware({ authPath: '/user', apiBase: `${API}/`, privateRoutes: ['/chat'] });

const request = (path: string, session?: string): NextRequest => {
  const req = new NextRequest(`${ORIGIN}${path}`);
  if (session !== undefined) {
    req.cookies.set('zx_session', session);
  }
  return req;
};

const apiAnswers = (status: number): ReturnType<typeof vi.fn> => {
  const fetchMock = vi.fn(async () => Promise.resolve(new Response(null, { status })));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

const location = (response: Response): string | null => response.headers.get('location');

describe('createAuthMiddleware', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lets public pages through without asking the API', async () => {
    const fetchMock = apiAnswers(HTTP_OK);
    const { activated } = await guard(request('/pricing'));
    expect(activated).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends a visitor without a session to the auth pages, remembering where they were going', async () => {
    const { activated, response } = await guard(request('/chat/42?tab=files'));
    expect(activated).toBe(true);
    expect(location(response)).toBe(`${ORIGIN}/user`);
    expect(response.cookies.get('href')?.value).toBe('/chat/42?tab=files');
  });

  it('checks the session against the API and lets a valid one through', async () => {
    const fetchMock = apiAnswers(HTTP_OK);
    const { activated } = await guard(request('/chat', 'sess-1'));
    expect(activated).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith(
      `${API}/v1/user`,
      expect.objectContaining({ headers: { Cookie: 'zx_session=sess-1' } }),
    );
  });

  it('sends the session cookie only to the configured API, whatever host the request names', async () => {
    const fetchMock = apiAnswers(HTTP_OK);
    const forged = new NextRequest(`${ORIGIN}/chat`, { headers: { host: 'attacker.example' } });
    forged.cookies.set('zx_session', 'sess-1');
    await guard(forged);
    expect(fetchMock).toHaveBeenCalledWith(`${API}/v1/user`, expect.anything());
  });

  it('always guards the account page and device pairing approval, remembering where to return', async () => {
    const { activated, response } = await guard(request('/user/manage'));
    expect(activated).toBe(true);
    expect(location(response)).toBe(`${ORIGIN}/user`);
    const pairing = await guard(request('/user/pair/approve?token=pair-1'));
    expect(location(pairing.response)).toBe(`${ORIGIN}/user`);
    expect(pairing.response.cookies.get('href')?.value).toBe('/user/pair/approve?token=pair-1');
  });

  it('lets a signed-out device ask to be paired', async () => {
    const { activated } = await guard(request('/user/pair'));
    expect(activated).toBe(false);
  });

  it('sends an unpaid account to subscribe', async () => {
    apiAnswers(HTTP_PAYMENT_REQUIRED);
    const { response } = await guard(request('/chat', 'sess-1'));
    expect(location(response)).toBe(`${ORIGIN}/user/subscribe`);
  });

  it('sends an account with something to finish to the account page, and lets it stay there', async () => {
    apiAnswers(HTTP_FORBIDDEN);
    const elsewhere = await guard(request('/chat', 'sess-1'));
    expect(location(elsewhere.response)).toBe(`${ORIGIN}/user/manage`);
    const there = await guard(request('/user/manage', 'sess-1'));
    expect(there.activated).toBe(false);
  });

  it('sends an expired session back to sign in', async () => {
    apiAnswers(HTTP_UNAUTHORIZED);
    const { response } = await guard(request('/chat', 'stale'));
    expect(location(response)).toBe(`${ORIGIN}/user`);
    expect(response.cookies.get('href')?.value).toBe('/chat');
  });

  it('shows the down page when the API fails or cannot be reached', async () => {
    apiAnswers(HTTP_UNAVAILABLE);
    expect(location((await guard(request('/chat', 'sess-1'))).response)).toBe(`${ORIGIN}/down`);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('fetch failed'))),
    );
    const unreachable = await guard(request('/chat', 'sess-1'));
    expect(location(unreachable.response)).toBe(`${ORIGIN}/down`);
    expect(unreachable.response.cookies.get('href')?.value).toBe('/chat');
  });

  it('remembers an invite link and starts at the auth pages', async () => {
    const { activated, response } = await guard(request('/?code=inv-1&email=Ada@Example.com&team=t1'));
    expect(activated).toBe(true);
    expect(location(response)).toBe(`${ORIGIN}/user`);
    expect(response.cookies.get('invitation')?.value).toBe('inv-1');
    expect(response.cookies.get('email')?.value).toBe('ada@example.com');
    expect(response.cookies.get('team')?.value).toBe('t1');
  });

  it('ignores an incomplete invite link', async () => {
    const { activated } = await guard(request('/?code=inv-1'));
    expect(activated).toBe(false);
  });

  it('serves only the landing page before launch', async () => {
    const landing = createAuthMiddleware({ authPath: '/user', apiBase: API, privateRoutes: [], landingOnly: true });
    expect((await landing(request('/'))).activated).toBe(false);
    expect(location((await landing(request('/pricing'))).response)).toBe(`${ORIGIN}/`);
  });
});
