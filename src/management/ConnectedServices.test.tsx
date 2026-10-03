// SPDX-License-Identifier: AGPL-3.0-or-later
import { render, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SWRConfig } from 'swr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthServerProvider } from '../AuthServerContext';
import type { Identity } from '../oauth2/link';
import { PENDING_OAUTH_KEY } from '../oauth2/pending';
import { ConnectedServices } from './ConnectedServices';

const SERVER = 'https://app.example.com/api';
const OAUTH = `${SERVER}/v1/auth/oauth`;
const HTTP_OK = 200;
const HTTP_NO_CONTENT = 204;
const HTTP_PRECONDITION_FAILED = 412;
const HTTP_SERVER_ERROR = 500;
const AUTHORIZE_URL = 'https://github.com/login/oauth/authorize?state=s1';
const LINKED_AT = '2026-10-03T09:00:00.000001';
const SIGNED_IN_AT = '2026-10-03T09:30:00.000002';
const DISCONNECT_GOOGLE = 'Disconnect Google';

const json = (body: object, status = HTTP_OK): Response => new Response(JSON.stringify(body), { status });

const renderServices = (): ReturnType<typeof render> =>
  render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <AuthServerProvider baseUrl={SERVER}>
        <ConnectedServices />
      </AuthServerProvider>
    </SWRConfig>,
  );

const googleIdentity = (updatedAt: string | null): Identity => ({
  id: 'i1',
  provider_instance_id: 'pi-google',
  provider: 'google',
  email: 'ada@example.com',
  created_at: LINKED_AT,
  updated_at: updatedAt,
});

describe('ConnectedServices', () => {
  const realLocation = window.location;
  const assign = vi.fn();
  let linked: Identity[] = [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === `${OAUTH}/providers`) {
      return Promise.resolve(
        json({
          providers: [
            { name: 'google', provider: 'google', friendly_name: 'Google', kind: 'oidc' },
            { name: 'github', provider: 'github', friendly_name: 'GitHub', kind: 'oauth2' },
          ],
        }),
      );
    }
    if (url.startsWith(`${OAUTH}/identity?`)) {
      return Promise.resolve(json({ o_auth_identities: linked }));
    }
    if (url === `${OAUTH}/link/authorize`) {
      return Promise.resolve(json({ authorize_url: AUTHORIZE_URL, state: 's1' }));
    }
    if (url === `${OAUTH}/identity/i1` && init?.method === 'DELETE') {
      // Like the server, unlink only at the identity's current version.
      const current = linked.find((identity) => identity.id === 'i1');
      const version = `"${current?.updated_at ?? current?.created_at ?? ''}"`;
      if (new Headers(init.headers).get('If-Match') !== version) {
        return Promise.resolve(
          json({ detail: 'The record was changed since it was read', current }, HTTP_PRECONDITION_FAILED),
        );
      }
      linked = [];
      return Promise.resolve(new Response(null, { status: HTTP_NO_CONTENT }));
    }
    return Promise.resolve(new Response('{"detail":"unexpected"}', { status: HTTP_SERVER_ERROR }));
  });

  beforeEach(() => {
    linked = [googleIdentity(null)];
    sessionStorage.clear();
    vi.stubGlobal('fetch', fetchMock);
    assign.mockReset();
    Object.defineProperty(window, 'location', { configurable: true, value: { assign } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockClear();
    Object.defineProperty(window, 'location', { configurable: true, value: realLocation });
  });

  it('lists the configured services with what is linked', async () => {
    const view = renderServices();
    const list = await view.findByRole('list', { name: 'Connected services' });
    expect(await within(list).findByText('Connected as ada@example.com')).toBeInTheDocument();
    expect(within(list).getByText('GitHub', { selector: 'p' })).toBeInTheDocument();
    expect(within(list).getByText('Not connected')).toBeInTheDocument();
  });

  it('leaves for the provider to connect, remembering the link', async () => {
    const user = userEvent.setup();
    const view = renderServices();
    await user.click(await view.findByRole('button', { name: 'Connect GitHub' }));
    await vi.waitFor(() => {
      expect(assign).toHaveBeenCalledWith(AUTHORIZE_URL);
    });
    expect(JSON.parse(sessionStorage.getItem(PENDING_OAUTH_KEY) ?? '')).toEqual({
      kind: 'link',
      provider: 'github',
      state: 's1',
    });
  });

  it('disconnects after confirming', async () => {
    const user = userEvent.setup();
    const view = renderServices();
    await user.click(await view.findByRole('button', { name: DISCONNECT_GOOGLE }));
    await user.click(await view.findByRole('button', { name: 'Disconnect' }));
    expect(await view.findByRole('button', { name: 'Connect Google' })).toBeInTheDocument();
  });

  it('shows an identity that changed since the page loaded, and unlinks it only when asked again', async () => {
    const user = userEvent.setup();
    const view = renderServices();
    const disconnect = await view.findByRole('button', { name: DISCONNECT_GOOGLE });
    linked = [googleIdentity(SIGNED_IN_AT)];
    await user.click(disconnect);
    await user.click(await view.findByRole('button', { name: 'Disconnect' }));
    expect(await view.findByText(/changed since this page loaded/)).toBeInTheDocument();
    expect(linked).toHaveLength(1);

    await user.click(view.getByRole('button', { name: DISCONNECT_GOOGLE }));
    await user.click(await view.findByRole('button', { name: 'Disconnect' }));
    expect(await view.findByRole('button', { name: 'Connect Google' })).toBeInTheDocument();
    expect(linked).toHaveLength(0);
  });
});
