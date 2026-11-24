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

  // The middleware remembers the return page only for a document navigation (`Sec-Fetch-Mode:
  // navigate`, or no Sec-Fetch headers at all). A `Sec-` header can't be built here (script may not
  // set one, and the test's Headers drop it), so the browser cases are proven against a real Next
  // server in an e2e instead; here, the two that can be built.
  it('never remembers a prefetch as the place to return to', async () => {
    const { activated, response } = await guard(
      new NextRequest(`${ORIGIN}/chat/settings`, { headers: { purpose: 'prefetch' } }),
    );
    // Still kept out: a prefetch of a private page is redirected like any other request.
    expect(activated).toBe(true);
    expect(location(response)).toBe(`${ORIGIN}/user`);
    expect(response.cookies.get('href')).toBeUndefined();
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

  it('always guards the account page, remembering where to return', async () => {
    const { activated, response } = await guard(request('/user/manage?tab=teams'));
    expect(activated).toBe(true);
    expect(location(response)).toBe(`${ORIGIN}/user`);
    expect(response.cookies.get('href')?.value).toBe('/user/manage?tab=teams');
  });

  it('leaves the other auth pages to signed-out visitors', async () => {
    const fetchMock = apiAnswers(HTTP_OK);
    const { activated } = await guard(request('/user/login'));
    expect(activated).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends someone signed in on from the sign-in pages to their account', async () => {
    apiAnswers(HTTP_OK);
    const results = await Promise.all(
      ['/user', '/user/login', '/user/register'].map(async (page) => guard(request(page, 'sess-1'))),
    );
    for (const { activated, response } of results) {
      expect(activated).toBe(true);
      expect(location(response)).toBe(`${ORIGIN}/user/manage`);
    }
  });

  it('shows the sign-in page to someone whose session has expired', async () => {
    apiAnswers(HTTP_UNAUTHORIZED);
    const { activated } = await guard(request('/user', 'stale'));
    expect(activated).toBe(false);
  });

  it('leaves signing out and sign-in links alone for someone signed in', async () => {
    const fetchMock = apiAnswers(HTTP_OK);
    const results = await Promise.all(['/user/logout', '/user/magic'].map(async (page) => guard(request(page, 'sess-1'))));
    expect(results.map(({ activated }) => activated)).toEqual([false, false]);
    expect(fetchMock).not.toHaveBeenCalled();
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

  // Zephyrex RPG's case: while the API is down, the page the person opened stays the place to
  // return to, and a prefetch that follows it (a sidebar link) never replaces it.
  it('keeps the opened page as the return while down, whatever is prefetched after it', async () => {
    apiAnswers(HTTP_UNAVAILABLE);
    const opened = await guard(request('/chat/42', 'sess-1'));
    expect(location(opened.response)).toBe(`${ORIGIN}/down`);
    expect(opened.response.cookies.get('href')?.value).toBe('/chat/42');
    const prefetch = new NextRequest(`${ORIGIN}/chat/settings`, { headers: { purpose: 'prefetch' } });
    prefetch.cookies.set('zx_session', 'sess-1');
    const prefetched = await guard(prefetch);
    expect(location(prefetched.response)).toBe(`${ORIGIN}/down`);
    expect(prefetched.response.cookies.get('href')).toBeUndefined();
  });

  it('remembers an invite link and starts at the auth pages', async () => {
    const { activated, response } = await guard(request('/?code=inv-1&email=Ada@Example.com&team=t1'));
    expect(activated).toBe(true);
    expect(location(response)).toBe(`${ORIGIN}/user`);
    expect(response.cookies.get('invitation')?.value).toBe('inv-1');
    expect(response.cookies.get('email')?.value).toBe('ada@example.com');
    expect(response.cookies.get('team')?.value).toBe('t1');
  });

  it('sends someone already signed in from an invite link to the account page to answer it', async () => {
    const fetchMock = apiAnswers(HTTP_OK);
    const { activated, response } = await guard(request('/?code=inv-1&email=ada@example.com&team=t1', 'sess-1'));
    expect(activated).toBe(true);
    expect(location(response)).toBe(`${ORIGIN}/user/manage`);
    expect(response.cookies.get('invitation')).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
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
