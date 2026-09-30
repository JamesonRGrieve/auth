// SPDX-License-Identifier: AGPL-3.0-or-later
import { renderHook, waitFor } from '@testing-library/react';
import { deleteCookie, setCookie } from 'cookies-next/client';
import { afterEach, describe, expect, it, type Mock, vi } from 'vitest';
import { withApi } from '../../tests/fixtures/apiWrapper';
import { useUser } from './useUser';

const SERVER = 'https://app.example.com/api';
const HTTP_OK = 200;
const HTTP_UNAUTHORIZED = 401;

const user = {
  id: '11111111-2222-3333-4444-555555555555',
  email: 'ada@example.com',
  active: true,
  createdAt: '2026-09-01T00:00:00Z',
};

const wrapper = withApi(`${SERVER}/`);

const answer = (status: number, body: object): Mock<(url: URL | string, init: RequestInit) => Promise<Response>> => {
  const fetchMock = vi.fn(async () =>
    Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

describe('useUser', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    deleteCookie('zx_csrf');
  });

  it('loads the signed-in user over GraphQL on the session cookie, with the CSRF token', async () => {
    setCookie('zx_csrf', 'csrf-1');
    const fetchMock = answer(HTTP_OK, { data: { user } });
    const { result } = renderHook(() => useUser(), { wrapper });
    await waitFor(() => {
      expect(result.current.data).toEqual(user);
    });
    const [url, init] = fetchMock.mock.calls[0] ?? ['', {}];
    expect(String(url)).toBe(`${SERVER}/graphql`);
    expect(init.credentials).toBe('same-origin');
    expect(new Headers(init.headers).get('X-CSRF-Token')).toBe('csrf-1');
    expect(new Headers(init.headers).get('Authorization')).toBeNull();
  });

  it('is null, asking nothing, without a session', () => {
    const fetchMock = answer(HTTP_OK, { data: { user } });
    const { result } = renderHook(() => useUser(), { wrapper });
    expect(result.current.data).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('is null when the API refuses the session', async () => {
    setCookie('zx_csrf', 'csrf-stale');
    answer(HTTP_UNAUTHORIZED, { detail: 'Not authenticated' });
    const { result } = renderHook(() => useUser(), { wrapper });
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.data).toBeNull();
  });

  it('needs the app’s API server', () => {
    expect(() => renderHook(() => useUser())).toThrow('useAuthServer must be used within an AuthServerProvider');
  });
});
