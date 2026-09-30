// SPDX-License-Identifier: AGPL-3.0-or-later
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TEST_AUTH_SERVER as SERVER, testAuthConfig } from '../tests/fixtures/authConfig';
import { AuthenticationContext } from './AuthenticationContext';
import MagicLink from './MagicLink';

const HTTP_OK = 200;
const HTTP_UNAUTHORIZED = 401;

const renderLanding = (): ReturnType<typeof render> =>
  render(
    <AuthenticationContext value={testAuthConfig}>
      <MagicLink />
    </AuthenticationContext>,
  );

const reply = (...bodies: [number, object][]): ReturnType<typeof vi.fn> => {
  const fetchMock = vi.fn();
  for (const [status, body] of bodies) {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }));
  }
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

describe('MagicLink', () => {
  const realLocation = window.location;
  const replace = vi.fn();

  const arriveWith = (search: string): void => {
    Object.defineProperty(window, 'location', { configurable: true, value: { search, replace } });
  };

  beforeEach(() => {
    replace.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(window, 'location', { configurable: true, value: realLocation });
  });

  it('redeems the link once and signs in', async () => {
    const fetchMock = reply([HTTP_OK, { token: 'jwt-1', user_id: 'u1', mfa_required: false }]);
    arriveWith('?token=link-1');
    renderLanding();
    await vi.waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/user');
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      `${SERVER}/v1/auth/magic-link/verify`,
      expect.objectContaining({ method: 'POST', body: '{"token":"link-1"}' }),
    );
  });

  it('asks for the second factor when the account has one', async () => {
    const fetchMock = reply(
      [HTTP_OK, { user_id: 'u1', mfa_required: true, challenge_token: 'c1', methods: [] }],
      [HTTP_OK, { token: 'jwt-1' }],
    );
    arriveWith('?token=link-1');
    const user = userEvent.setup();
    const view = renderLanding();
    await user.type(await view.findByLabelText('Authenticator or recovery code'), '123456');
    expect(replace).not.toHaveBeenCalled();
    await user.click(view.getByRole('button', { name: 'Verify' }));
    await vi.waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/user');
    });
    expect(fetchMock).toHaveBeenLastCalledWith(
      `${SERVER}/v1/user/authorize/mfa`,
      expect.objectContaining({ body: '{"challenge_token":"c1","code":"123456"}' }),
    );
  });

  it('explains a spent or broken link', async () => {
    reply([HTTP_UNAUTHORIZED, { detail: 'Invalid or expired magic-link token' }]);
    arriveWith('?token=old');
    const view = renderLanding();
    expect(await view.findByRole('alert')).toHaveTextContent('Invalid or expired magic-link token');
  });

  it('refuses a link without a token, without asking the server', async () => {
    const fetchMock = reply();
    arriveWith('');
    const view = renderLanding();
    expect(await view.findByRole('alert')).toHaveTextContent('This sign-in link is incomplete.');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
