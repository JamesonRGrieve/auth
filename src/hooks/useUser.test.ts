// SPDX-License-Identifier: AGPL-3.0-or-later
import { getCookie } from 'cookies-next/client';
import useSWR, { type BareFetcher } from 'swr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUser } from './useUser';

vi.mock('swr', () => ({
  default: vi.fn(() => ({ data: undefined, error: undefined, isLoading: true })),
}));

vi.mock('cookies-next/client', () => ({
  getCookie: vi.fn(() => 'test-jwt'),
}));

vi.mock('../lib/log', () => ({ default: vi.fn() }));

const { requestMock } = vi.hoisted(() => ({ requestMock: vi.fn() }));
vi.mock('./lib', () => ({
  createGraphQLClient: vi.fn(() => ({ request: requestMock })),
}));

const lastFetcher = (): BareFetcher => {
  const fetcher = vi.mocked(useSWR).mock.calls.at(-1)?.[1];
  if (typeof fetcher !== 'function') {
    throw new TypeError('expected a fetcher function to be passed to useSWR');
  }
  return fetcher;
};

describe('useUser', () => {
  beforeEach(() => {
    vi.mocked(getCookie).mockReturnValue('test-jwt');
    requestMock.mockReset();
  });

  afterEach(() => {
    vi.mocked(useSWR).mockClear();
  });

  it('passes a keyed fetcher to useSWR', () => {
    useUser();
    expect(useSWR).toHaveBeenCalled();
  });

  it('uses an array key whose first element is the user endpoint', () => {
    useUser();
    const key = vi.mocked(useSWR).mock.calls.at(-1)?.[0];
    expect(Array.isArray(key) ? key[0] : key).toBe('/user');
  });

  it('seeds a null (signed-out) fallback on the SWR options', () => {
    useUser();
    const options = vi.mocked(useSWR).mock.calls.at(-1)?.[2];
    expect(options).toEqual({ fallbackData: null });
  });

  it('fetcher returns null when no jwt cookie is present', async () => {
    vi.mocked(getCookie).mockReturnValue(undefined);
    useUser();
    await expect(lastFetcher()(['/user', undefined])).resolves.toBeNull();
    expect(requestMock).not.toHaveBeenCalled();
  });

  it('fetcher returns the parsed user on a successful request', async () => {
    const user = {
      id: '11111111-1111-1111-1111-111111111111',
      email: 'a@b.com',
      active: true,
      createdAt: '2024-01-01T00:00:00Z',
    };
    requestMock.mockResolvedValue({ user });
    useUser();
    await expect(lastFetcher()(['/user', 'test-jwt'])).resolves.toMatchObject({
      id: user.id,
      email: user.email,
    });
    expect(requestMock).toHaveBeenCalledOnce();
  });

  it('fetcher resolves to null (no user) when the request rejects', async () => {
    requestMock.mockRejectedValue(new Error('network'));
    useUser();
    await expect(lastFetcher()(['/user', 'test-jwt'])).resolves.toBeNull();
  });
});
