// SPDX-License-Identifier: AGPL-3.0-or-later
import { deleteCookie, setCookie } from 'cookies-next/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { AuthApiError, authList, authRequest, authSend, LIST_PAGE_SIZE } from './api';

const API_URL = 'https://api.example.com/v1/user';
const HTTP_OK = 200;
const HTTP_NO_CONTENT = 204;
const HTTP_FORBIDDEN = 403;
const HTTP_UNPROCESSABLE = 422;
const HTTP_BAD_GATEWAY = 502;

const respond = (response: Response): ReturnType<typeof vi.fn> => {
  const fetchMock = vi.fn(async () => Promise.resolve(response));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

describe('authRequest', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    deleteCookie('zx_csrf');
  });

  it('rides the session cookie with the CSRF token on writes, and validates the answer', async () => {
    setCookie('zx_csrf', 'csrf-1');
    const fetchMock = respond(new Response(JSON.stringify({ user: { id: 'u1' } }), { status: HTTP_OK }));
    const result = await authRequest(API_URL, z.object({ user: z.object({ id: z.string() }) }), {
      method: 'PUT',
      body: { user: { first_name: 'Ada' } },
    });
    expect(result).toEqual({ user: { id: 'u1' } });
    expect(fetchMock).toHaveBeenCalledWith(API_URL, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'csrf-1' },
      body: '{"user":{"first_name":"Ada"}}',
    });
  });

  it('sends no CSRF token on reads, and never an Authorization header for the session', async () => {
    setCookie('zx_csrf', 'csrf-1');
    const fetchMock = respond(new Response('{}', { status: HTTP_OK }));
    await authRequest(API_URL, z.object({}));
    expect(fetchMock).toHaveBeenCalledWith(API_URL, {
      method: 'GET',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('sends an explicit authorization, e.g. Basic credentials for the password step', async () => {
    const fetchMock = respond(new Response('{}', { status: HTTP_OK }));
    await authRequest(API_URL, z.object({}), { method: 'POST', authorization: 'Basic YTpi' });
    expect(fetchMock).toHaveBeenCalledWith(API_URL, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Basic YTpi' },
    });
  });

  it('rejects an answer that does not match the schema', async () => {
    respond(new Response('{"user":null}', { status: HTTP_OK }));
    await expect(authRequest(API_URL, z.object({ user: z.object({ id: z.string() }) }))).rejects.toThrow(z.ZodError);
  });

  it('raises the server’s detail with its status', async () => {
    respond(new Response('{"detail":"active: root only"}', { status: HTTP_FORBIDDEN }));
    await expect(authRequest(API_URL, z.object({}))).rejects.toEqual(new AuthApiError(HTTP_FORBIDDEN, 'active: root only'));
  });

  it('raises a structured detail’s message, with the rules the refused value broke', async () => {
    respond(
      new Response('{"detail":{"message":"Password does not meet the policy","failed":["min_length","require_digit"]}}', {
        status: HTTP_UNPROCESSABLE,
      }),
    );
    await expect(authSend(API_URL)).rejects.toEqual(
      new AuthApiError(HTTP_UNPROCESSABLE, 'Password does not meet the policy', ['min_length', 'require_digit']),
    );
  });

  it('falls back to the raw body, then the status text, when there is no detail', async () => {
    respond(new Response('upstream down', { status: HTTP_BAD_GATEWAY }));
    await expect(authSend(API_URL)).rejects.toMatchObject({ status: HTTP_BAD_GATEWAY, detail: 'upstream down' });
    respond(new Response('', { status: HTTP_BAD_GATEWAY, statusText: 'Bad Gateway' }));
    await expect(authSend(API_URL)).rejects.toMatchObject({ detail: 'Bad Gateway' });
  });
});

describe('authSend', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resolves on a bodiless success', async () => {
    respond(new Response(null, { status: HTTP_NO_CONTENT }));
    await expect(authSend(API_URL, { method: 'DELETE' })).resolves.toBeUndefined();
  });
});

describe('authList', () => {
  const LIST_URL = 'https://api.example.com/v1/team/t1/invitation';
  const Row = z.object({ id: z.string() });
  const page = (ids: string[], hasMore: boolean): Response =>
    new Response(JSON.stringify({ invitations: ids.map((id) => ({ id })), pagination: { has_more: hasMore } }), {
      status: HTTP_OK,
    });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('walks every page until the server has no more', async () => {
    const fetchMock = vi
      .fn<(url: string) => Promise<Response>>()
      .mockResolvedValueOnce(page(['a', 'b'], true))
      .mockResolvedValueOnce(page(['c'], false));
    vi.stubGlobal('fetch', fetchMock);
    await expect(authList(LIST_URL, 'invitations', Row)).resolves.toEqual([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      `${LIST_URL}?offset=0&limit=${LIST_PAGE_SIZE}`,
      `${LIST_URL}?offset=${LIST_PAGE_SIZE}&limit=${LIST_PAGE_SIZE}`,
    ]);
  });

  it('keeps an existing query string, and takes an unpaginated answer as the whole list', async () => {
    const fetchMock = respond(new Response('{"invitations":[{"id":"a"}]}', { status: HTTP_OK }));
    await expect(authList(`${LIST_URL}?sort_by=created_at`, 'invitations', Row)).resolves.toEqual([{ id: 'a' }]);
    expect(fetchMock).toHaveBeenCalledWith(
      `${LIST_URL}?sort_by=created_at&offset=0&limit=${LIST_PAGE_SIZE}`,
      expect.anything(),
    );
  });

  it('rejects rows that do not match the schema', async () => {
    respond(new Response('{"invitations":[{"id":1}]}', { status: HTTP_OK }));
    await expect(authList(LIST_URL, 'invitations', Row)).rejects.toThrow(z.ZodError);
  });
});
