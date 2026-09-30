// SPDX-License-Identifier: AGPL-3.0-or-later
import { renderHook, waitFor } from '@testing-library/react';
import { deleteCookie, getCookie, setCookie } from 'cookies-next/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { withApi } from '../../tests/fixtures/apiWrapper';
import { withSession } from '../../tests/fixtures/session';
import { SYSTEM_TEAM_ID, useTeam, useTeams } from './useTeam';

let signOut: () => void = () => undefined;
beforeEach(() => {
  signOut = withSession();
});
afterEach(() => {
  signOut();
});

const SERVER = 'https://app.example.com';
const HTTP_OK = 200;
const HTTP_UNAUTHORIZED = 401;

const team = (id: string, name: string): { id: string; name: string; createdAt: string } => ({
  id,
  name,
  createdAt: '2026-09-01T00:00:00Z',
});
const alpha = team('11111111-1111-1111-1111-111111111111', 'Alpha');
const beta = team('22222222-2222-2222-2222-222222222222', 'Beta');
const system = team(SYSTEM_TEAM_ID, 'System');

const wrapper = withApi(SERVER);

const serveTeams = (status: number, body: object): void => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })),
    ),
  );
};

describe('useTeams', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    deleteCookie('auth-team');
  });

  it('lists the user’s teams without the system team, and selects the first when none is active', async () => {
    serveTeams(HTTP_OK, { data: { teams: [alpha, system, beta] } });
    const { result } = renderHook(() => useTeams(), { wrapper });
    await waitFor(() => {
      expect(result.current.data?.map((item) => item.name)).toEqual(['Alpha', 'Beta']);
    });
    expect(getCookie('auth-team')).toBe(alpha.id);
  });

  it('keeps the active team when it is still one of the user’s', async () => {
    setCookie('auth-team', beta.id);
    serveTeams(HTTP_OK, { data: { teams: [alpha, beta] } });
    const { result } = renderHook(() => useTeams(), { wrapper });
    await waitFor(() => {
      expect(result.current.data).toHaveLength(2);
    });
    expect(getCookie('auth-team')).toBe(beta.id);
  });

  it('is empty when the API refuses the session', async () => {
    serveTeams(HTTP_UNAUTHORIZED, { detail: 'Not authenticated' });
    const { result } = renderHook(() => useTeams(), { wrapper });
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.data).toEqual([]);
  });

  it('asks nothing, and is empty, without a session', () => {
    signOut();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useTeams(), { wrapper });
    expect(result.current.data).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('useTeam', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    deleteCookie('auth-team');
  });

  it('finds the requested team, or the active one when none is named', async () => {
    serveTeams(HTTP_OK, { data: { teams: [alpha, beta] } });
    const named = renderHook(() => useTeam(beta.id), { wrapper });
    await waitFor(() => {
      expect(named.result.current.data?.name).toBe('Beta');
    });

    setCookie('auth-team', alpha.id);
    const active = renderHook(() => useTeam(), { wrapper });
    await waitFor(() => {
      expect(active.result.current.data?.name).toBe('Alpha');
    });
  });

  it('is null for a team the user does not belong to', async () => {
    serveTeams(HTTP_OK, { data: { teams: [alpha] } });
    const { result } = renderHook(() => useTeam('33333333-3333-3333-3333-333333333333'), { wrapper });
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.data).toBeNull();
  });
});
