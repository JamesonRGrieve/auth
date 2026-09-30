// SPDX-License-Identifier: AGPL-3.0-or-later
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TEST_AUTH_SERVER as SERVER, testAuthConfig } from '../../tests/fixtures/authConfig';
import { AuthenticationContext } from '../AuthenticationContext';
import type { AuthenticationConfig } from '../Router';
import OAuth from './OAuth';

const HTTP_OK = 200;
const HTTP_BAD_REQUEST = 400;
const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth?state=s1';

const renderOAuth = (oauthProviders: AuthenticationConfig['oauthProviders']): ReturnType<typeof render> =>
  render(
    <AuthenticationContext value={{ ...testAuthConfig, oauthProviders }}>
      <OAuth />
    </AuthenticationContext>,
  );

describe('OAuth', () => {
  const realLocation = window.location;
  const assign = vi.fn();

  beforeEach(() => {
    sessionStorage.clear();
    assign.mockReset();
    Object.defineProperty(window, 'location', { configurable: true, value: { assign } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(window, 'location', { configurable: true, value: realLocation });
  });

  it('offers nothing when no provider is configured', () => {
    const view = renderOAuth([]);
    expect(view.container).toBeEmptyDOMElement();
  });

  it('offers each configured provider and leaves for the one chosen', async () => {
    const fetchMock = vi.fn(async () =>
      Promise.resolve(new Response(JSON.stringify({ authorize_url: AUTHORIZE_URL, state: 's1' }), { status: HTTP_OK })),
    );
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    const view = renderOAuth(['google', 'github']);
    expect(view.getByRole('button', { name: 'Continue with GitHub' })).toBeInTheDocument();
    await user.click(view.getByRole('button', { name: 'Continue with Google' }));
    await vi.waitFor(() => {
      expect(assign).toHaveBeenCalledWith(AUTHORIZE_URL);
    });
    expect(fetchMock).toHaveBeenCalledWith(
      `${SERVER}/v1/auth/oauth/authorize`,
      expect.objectContaining({ body: '{"provider":"google"}' }),
    );
  });

  it('says why sign-in could not start', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Promise.resolve(new Response('{"detail":"Unknown OAuth provider: google"}', { status: HTTP_BAD_REQUEST })),
      ),
    );
    const user = userEvent.setup();
    const view = renderOAuth(['google']);
    await user.click(view.getByRole('button', { name: 'Continue with Google' }));
    expect(await view.findByRole('alert')).toHaveTextContent('Unknown OAuth provider: google');
    expect(view.getByRole('button', { name: 'Continue with Google' })).toBeEnabled();
  });
});
