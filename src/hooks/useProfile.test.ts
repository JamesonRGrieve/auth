// SPDX-License-Identifier: AGPL-3.0-or-later
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { SWRConfig } from 'swr';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PROFILE_ENDPOINT, useProfile } from './useProfile';

const AUTH_SERVER = 'https://api.example.com';
const URL_ = `${AUTH_SERVER}${PROFILE_ENDPOINT}`;
const HTTP_OK = 200;
const HTTP_UNAUTHORIZED = 401;

const user = { id: 'u1', email: 'ada@example.com', first_name: 'Ada', timezone: null };

const wrapper = ({ children }: { children: ReactNode }): ReactNode =>
  createElement(SWRConfig, { value: { provider: () => new Map(), dedupingInterval: 0 } }, children);

const json = (body: object, status = HTTP_OK): Response => new Response(JSON.stringify(body), { status });

describe('useProfile', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads the signed-in user from GET /v1/user', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.resolve(json({ user }))),
    );
    const { result } = renderHook(() => useProfile(AUTH_SERVER), { wrapper });
    await waitFor(() => {
      expect(result.current.profile).toEqual(user);
    });
  });

  it('PUTs the changes wrapped in `user` and adopts the saved profile', async () => {
    const saved = { ...user, first_name: 'Augusta' };
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) =>
      Promise.resolve(json({ user: init.method === 'PUT' ? saved : user })),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useProfile(AUTH_SERVER), { wrapper });
    await waitFor(() => {
      expect(result.current.profile).toEqual(user);
    });

    await act(async () => {
      await result.current.update({ first_name: 'Augusta' });
    });
    expect(fetchMock).toHaveBeenCalledWith(
      URL_,
      expect.objectContaining({ method: 'PUT', body: '{"user":{"first_name":"Augusta"}}' }),
    );
    expect(result.current.profile).toEqual(saved);
  });

  it('PATCHes a password change and returns the server’s message', async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) =>
      Promise.resolve(init.method === 'PATCH' ? json({ message: 'Password changed successfully' }) : json({ user })),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useProfile(AUTH_SERVER), { wrapper });
    const message = await result.current.changePassword('old', 'new');
    expect(message).toBe('Password changed successfully');
    expect(fetchMock).toHaveBeenCalledWith(
      URL_,
      expect.objectContaining({ method: 'PATCH', body: '{"current_password":"old","new_password":"new"}' }),
    );
  });

  it('exposes a failed load as an error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.resolve(json({ detail: 'Session has been revoked' }, HTTP_UNAUTHORIZED))),
    );
    const { result } = renderHook(() => useProfile(AUTH_SERVER), { wrapper });
    await waitFor(() => {
      expect(result.current.error?.message).toBe('Session has been revoked');
    });
  });
});
