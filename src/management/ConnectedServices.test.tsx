// SPDX-License-Identifier: AGPL-3.0-or-later
import { render, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SWRConfig } from 'swr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthServerProvider } from '../AuthServerContext';
import { PENDING_OAUTH_KEY } from '../oauth2/pending';
import { ConnectedServices } from './ConnectedServices';

const SERVER = 'https://app.example.com/api';
const HTTP_OK = 200;
const AUTHORIZE_URL = 'https://github.com/login/oauth/authorize?state=s1';

const json = (body: object): Response => new Response(JSON.stringify(body), { status: HTTP_OK });

const renderServices = (): ReturnType<typeof render> =>
  render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <AuthServerProvider baseUrl={SERVER}>
        <ConnectedServices />
      </AuthServerProvider>
    </SWRConfig>,
  );

describe('ConnectedServices', () => {
  const realLocation = window.location;
  const assign = vi.fn();
  let linked = [{ provider: 'google', account_email: 'ada@example.com' }];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith('/providers')) {
      return Promise.resolve(
        json({
          providers: [
            { name: 'google', configured: true },
            { name: 'github', configured: true },
            { name: 'amazon', configured: false },
          ],
        }),
      );
    }
    if (url.endsWith('/connections')) {
      return Promise.resolve(json({ connections: linked }));
    }
    if (url.endsWith('/connect/github')) {
      return Promise.resolve(json({ authorize_url: AUTHORIZE_URL, state: 's1' }));
    }
    if (url.endsWith('/disconnect/google') && init?.method === 'DELETE') {
      linked = [];
      return Promise.resolve(json({ disconnected: true }));
    }
    return Promise.resolve(new Response('{"detail":"unexpected"}', { status: 500 }));
  });

  beforeEach(() => {
    linked = [{ provider: 'google', account_email: 'ada@example.com' }];
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
    expect(within(list).queryByText('Amazon')).toBeNull();
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
    await user.click(await view.findByRole('button', { name: 'Disconnect Google' }));
    await user.click(await view.findByRole('button', { name: 'Disconnect' }));
    expect(await view.findByRole('button', { name: 'Connect Google' })).toBeInTheDocument();
  });
});
