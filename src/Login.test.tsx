// SPDX-License-Identifier: AGPL-3.0-or-later
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { TEST_AUTH_SERVER as SERVER, testAuthConfig } from '../tests/fixtures/authConfig';
import { AuthenticationContext } from './AuthenticationContext';
import Login, { type LoginProps } from './Login';

const HTTP_OK = 200;
const HTTP_UNAUTHORIZED = 401;

const renderLogin = (): ReturnType<typeof render> =>
  render(
    <AuthenticationContext value={testAuthConfig}>
      <Login />
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

describe('Login', () => {
  const realLocation = window.location;

  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: '', protocol: 'https:', hostname: 'app.example.com' },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(window, 'location', { configurable: true, value: realLocation });
    document.cookie = 'jwt=; path=/; max-age=0';
  });

  it('signs in straight away when the account has no second factor', async () => {
    reply([HTTP_OK, { token: 'jwt-1' }]);
    const user = userEvent.setup();
    const view = renderLogin();
    await user.type(view.getByLabelText('Password'), 'pw');
    await user.click(view.getByRole('button', { name: 'Login' }));
    await vi.waitFor(() => {
      expect(document.cookie).toContain('jwt=jwt-1');
    });
    expect(window.location.href).toBe('https://app.example.com/user');
  });

  it('asks for the second factor, then signs in with the code', async () => {
    const fetchMock = reply(
      [HTTP_OK, { mfa_required: true, challenge_token: 'c1', methods: [{ id: 'm1', method_type: 'totp' }] }],
      [HTTP_OK, { token: 'jwt-2' }],
    );
    const user = userEvent.setup();
    const view = renderLogin();
    await user.type(view.getByLabelText('Password'), 'pw');
    await user.click(view.getByRole('button', { name: 'Login' }));

    await user.type(await view.findByLabelText('Authenticator or recovery code'), '123456');
    expect(document.cookie).not.toContain('jwt=');
    await user.click(view.getByRole('button', { name: 'Verify' }));

    await vi.waitFor(() => {
      expect(document.cookie).toContain('jwt=jwt-2');
    });
    expect(fetchMock).toHaveBeenLastCalledWith(
      `${SERVER}/v1/user/authorize/mfa`,
      expect.objectContaining({ method: 'POST', body: '{"challenge_token":"c1","code":"123456"}' }),
    );
  });

  it('keeps the challenge open after a wrong code', async () => {
    reply(
      [HTTP_OK, { mfa_required: true, challenge_token: 'c1', methods: [] }],
      [HTTP_UNAUTHORIZED, { detail: 'Invalid MFA code' }],
    );
    const user = userEvent.setup();
    const view = renderLogin();
    await user.type(view.getByLabelText('Password'), 'pw');
    await user.click(view.getByRole('button', { name: 'Login' }));
    await user.type(await view.findByLabelText('Authenticator or recovery code'), '000000');
    await user.click(view.getByRole('button', { name: 'Verify' }));
    expect(await view.findByRole('alert')).toHaveTextContent('Invalid MFA code');
    expect(view.getByLabelText('Authenticator or recovery code')).toBeInTheDocument();
  });

  it('shows the server’s reason for a refused password', async () => {
    reply([HTTP_UNAUTHORIZED, { detail: 'Invalid credentials' }]);
    const user = userEvent.setup();
    const view = renderLogin();
    await user.type(view.getByLabelText('Password'), 'wrong');
    await user.click(view.getByRole('button', { name: 'Login' }));
    expect(await view.findByText('Invalid credentials')).toBeInTheDocument();
  });

  it('keeps the optional login endpoint override', () => {
    expectTypeOf<LoginProps>().toEqualTypeOf<{ userLoginEndpoint?: string }>();
  });
});
