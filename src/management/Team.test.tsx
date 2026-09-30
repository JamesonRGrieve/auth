// SPDX-License-Identifier: AGPL-3.0-or-later
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { deleteCookie, getCookie } from 'cookies-next/client';
import { SWRConfig } from 'swr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthServerProvider } from '../AuthServerContext';
import { SidebarProvider } from '../components/ui/sidebar';
import { Team } from './Team';

const push = vi.fn();
vi.mock('next/navigation.js', () => ({ useRouter: () => ({ push }) }));

const SERVER = 'https://app.example.com/api';
const ALPHA = '11111111-1111-1111-1111-111111111111';
const BETA = '22222222-2222-2222-2222-222222222222';
const ME = '33333333-3333-3333-3333-333333333333';
const HTTP_OK = 200;
const HTTP_CREATED = 201;

const json = (body: object, status = HTTP_OK): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const team = (id: string, name: string): object => ({ id, name, createdAt: '2026-09-01T00:00:00Z' });

const renderTeam = (teamId?: string): ReturnType<typeof render> =>
  render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <AuthServerProvider baseUrl={SERVER}>
        <SidebarProvider>
          <Team teamId={teamId} />
        </SidebarProvider>
      </AuthServerProvider>
    </SWRConfig>,
  );

describe('Team', () => {
  let myRole: string;
  let calls: { url: string; init: RequestInit | undefined }[];

  beforeEach(() => {
    myRole = 'r-admin';
    calls = [];
    push.mockReset();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: URL | string, init?: RequestInit) => {
        const url = String(input);
        calls.push({ url, init });
        if (url.endsWith('/graphql')) {
          const query = typeof init?.body === 'string' ? init.body : '';
          return Promise.resolve(
            json(
              query.includes('teams')
                ? { data: { teams: [team(ALPHA, 'Alpha'), team(BETA, 'Beta')] } }
                : { data: { user: { id: ME, email: 'me@example.com', active: true, createdAt: '2026-09-01T00:00:00Z' } } },
            ),
          );
        }
        if (url === `${SERVER}/v1/team` && init?.method === 'POST') {
          return Promise.resolve(json({ team: { id: 't-new' } }, HTTP_CREATED));
        }
        if (url.endsWith('/user')) {
          return Promise.resolve(json({ user_teams: [{ id: 'm1', user_id: ME, team_id: ALPHA, role_id: myRole }] }));
        }
        if (url.startsWith(`${SERVER}/v1/role`)) {
          return Promise.resolve(
            json({
              roles: [
                { id: 'r-user', name: 'user', parent_id: null, team_id: null },
                { id: 'r-admin', name: 'admin', parent_id: 'r-user', team_id: null },
              ],
            }),
          );
        }
        return Promise.resolve(json({}));
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    deleteCookie('auth-team');
  });

  it('switches to another team, remembering it as active', async () => {
    const user = userEvent.setup();
    const view = renderTeam(ALPHA);
    const switcher = await view.findByLabelText('Team');
    await vi.waitFor(() => {
      expect(switcher).toHaveValue(ALPHA);
    });
    await user.selectOptions(switcher, BETA);
    expect(push).toHaveBeenCalledWith(`/team/${BETA}`);
    expect(getCookie('auth-team')).toBe(BETA);
  });

  it('lets an admin rename the team', async () => {
    const view = renderTeam(ALPHA);
    expect(await view.findByRole('button', { name: 'Rename team' })).toBeInTheDocument();
  });

  it('hides renaming from a member who is not an admin', async () => {
    myRole = 'r-user';
    const view = renderTeam(ALPHA);
    await view.findByLabelText('Team');
    // Once both the membership and the roles have loaded, the admin check has its answer.
    await vi.waitFor(() => {
      expect(calls.some(({ url }) => url.startsWith(`${SERVER}/v1/role`))).toBe(true);
      expect(calls.some(({ url }) => url === `${SERVER}/v1/team/${ALPHA}/user`)).toBe(true);
    });
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    expect(view.queryByRole('button', { name: 'Rename team' })).toBeNull();
  });

  it('creates a team, confirming a name already in use, then opens it', async () => {
    const user = userEvent.setup();
    const view = renderTeam(ALPHA);
    await user.click(await view.findByRole('button', { name: 'Create team' }));
    await user.type(view.getByLabelText('Team name'), 'alpha');
    await user.click(view.getByRole('button', { name: 'Create' }));
    expect(await view.findByRole('status')).toHaveTextContent('You already belong to a team with this name.');
    await user.click(view.getByRole('button', { name: 'Create' }));
    await vi.waitFor(() => {
      expect(push).toHaveBeenCalledWith('/team/t-new');
    });
    const created = calls.find(({ url, init }) => url === `${SERVER}/v1/team` && init?.method === 'POST');
    expect(created?.init?.body).toBe('{"team":{"name":"alpha"}}');
  });
});
