// SPDX-License-Identifier: AGPL-3.0-or-later
import { deleteCookie, setCookie } from 'cookies-next/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { AuthApiError, authRequest, authSend } from './api';

const API_URL = 'https://api.example.com/v1/user';
const HTTP_OK = 200;
const HTTP_NO_CONTENT = 204;
const HTTP_FORBIDDEN = 403;
const HTTP_BAD_GATEWAY = 502;

const respond = (response: Response): ReturnType<typeof vi.fn> => {
  const fetchMock = vi.fn(async () => Promise.resolve(response));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

describe('authRequest', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    deleteCookie('jwt');
  });

  it('sends the session token and JSON body, and validates the answer', async () => {
    setCookie('jwt', 'token-1');
    const fetchMock = respond(new Response(JSON.stringify({ user: { id: 'u1' } }), { status: HTTP_OK }));
    const result = await authRequest(API_URL, z.object({ user: z.object({ id: z.string() }) }), {
      method: 'PUT',
      body: { user: { first_name: 'Ada' } },
    });
    expect(result).toEqual({ user: { id: 'u1' } });
    expect(fetchMock).toHaveBeenCalledWith(API_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer token-1' },
      body: '{"user":{"first_name":"Ada"}}',
    });
  });

  it('sends no Authorization header when signed out', async () => {
    const fetchMock = respond(new Response('{}', { status: HTTP_OK }));
    await authRequest(API_URL, z.object({}));
    expect(fetchMock).toHaveBeenCalledWith(API_URL, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
  });

  it('rejects an answer that does not match the schema', async () => {
    respond(new Response('{"user":null}', { status: HTTP_OK }));
    await expect(authRequest(API_URL, z.object({ user: z.object({ id: z.string() }) }))).rejects.toThrow(z.ZodError);
  });

  it('raises the server’s detail with its status', async () => {
    respond(new Response('{"detail":"active: root only"}', { status: HTTP_FORBIDDEN }));
    await expect(authRequest(API_URL, z.object({}))).rejects.toEqual(new AuthApiError(HTTP_FORBIDDEN, 'active: root only'));
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
