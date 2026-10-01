// SPDX-License-Identifier: AGPL-3.0-or-later
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { deleteCookie, getCookie, setCookie } from 'cookies-next/client';
import { SWRConfig } from 'swr';
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { TEST_AUTH_SERVER as SERVER, testAuthConfig } from '../tests/fixtures/authConfig';
import { AuthenticationContext } from './AuthenticationContext';
import Register, { type RegisterProps } from './Register';
import { PASSWORD_POLICY_ENDPOINT } from './lib/passwordPolicy';

const push = vi.fn();
vi.mock('next/navigation.js', () => ({ useRouter: () => ({ push }) }));

const HTTP_OK = 200;
const HTTP_CREATED = 201;
const HTTP_CONFLICT = 409;
const HTTP_UNPROCESSABLE = 422;
const POLICY = { min_length: 8, max_bytes: 72, require_letter: true, require_digit: true };

/** The auth server: the password policy at its endpoint, and `registration` for the sign-up POST. */
const serve = (registration: () => Response): ReturnType<typeof vi.fn<typeof fetch>> => {
  const fetchMock = vi.fn<typeof fetch>(async (input) =>
    Promise.resolve(
      (typeof input === 'string' ? input : input instanceof URL ? input.href : input.url).endsWith(PASSWORD_POLICY_ENDPOINT)
        ? new Response(JSON.stringify(POLICY), { status: HTTP_OK })
        : registration(),
    ),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

const registrations = (fetchMock: ReturnType<typeof serve>): unknown[][] =>
  fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST');

const renderRegister = (): ReturnType<typeof render> =>
  render(
    <AuthenticationContext value={testAuthConfig}>
      <SWRConfig value={{ provider: () => new Map() }}>
        <Register />
      </SWRConfig>
    </AuthenticationContext>,
  );

const typePasswords = async (user: ReturnType<typeof userEvent.setup>, first: string, again: string): Promise<void> => {
  const view = document.body;
  await user.type(view.querySelector<HTMLInputElement>('#password') ?? view, first);
  await user.type(view.querySelector<HTMLInputElement>('#password-again') ?? view, again);
};

describe('Register', () => {
  beforeEach(() => {
    push.mockReset();
    setCookie('email', 'Ada@Example.com');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    deleteCookie('email');
    deleteCookie('invitation');
    deleteCookie('team');
  });

  it('says when the passwords differ, on the repeated field', async () => {
    const user = userEvent.setup();
    const view = renderRegister();
    await typePasswords(user, 'correct horse', 'correct hors');
    const again = view.getByLabelText('Password (Again)');
    expect(again).toHaveAttribute('aria-invalid', 'true');
    expect(again).toHaveAccessibleDescription('The passwords do not match.');
    expect(view.getByRole('button', { name: 'Register' })).toBeDisabled();
  });

  it('registers once with the invitation, never sending the repeated password', async () => {
    setCookie('invitation', 'inv-1');
    setCookie('team', 'Alpha');
    const fetchMock = serve(() => new Response('{}', { status: HTTP_CREATED }));
    const user = userEvent.setup();
    const view = renderRegister();
    expect(view.getByText(/invited to join Alpha/)).toBeInTheDocument();
    await typePasswords(user, 'correct horse 9', 'correct horse 9');
    await user.click(view.getByRole('button', { name: 'Accept Invitation' }));
    await vi.waitFor(() => {
      expect(push).toHaveBeenCalledWith('/user/login');
    });
    expect(registrations(fetchMock)).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      `${SERVER}/v1/user`,
      expect.objectContaining({
        body: JSON.stringify({ user: { email: 'ada@example.com', password: 'correct horse 9', invitation_code: 'inv-1' } }),
      }),
    );
    expect(getCookie('invitation')).toBeUndefined();
  });

  it('shows the server’s refusal and lets the user try again', async () => {
    serve(() => new Response('{"detail":"A user with this email already exists"}', { status: HTTP_CONFLICT }));
    const user = userEvent.setup();
    const view = renderRegister();
    await typePasswords(user, 'pw-12345678', 'pw-12345678');
    await user.click(view.getByRole('button', { name: 'Register' }));
    expect(await view.findByText('A user with this email already exists')).toBeInTheDocument();
    expect(view.getByRole('button', { name: 'Register' })).toBeEnabled();
  });

  it('shows the server’s password rule and holds the form until the password keeps it', async () => {
    const fetchMock = serve(() => new Response('{}', { status: HTTP_CREATED }));
    const user = userEvent.setup();
    const view = renderRegister();
    const rules = await view.findByRole('list', { name: 'Password requirements' });
    expect(view.getByLabelText('Password')).toHaveAccessibleDescription(/At least 8 characters/);
    await typePasswords(user, 'abcdefgh', 'abcdefgh');
    expect(rules).toHaveTextContent('At least one digit: not met yet');
    expect(view.getByRole('button', { name: 'Register' })).toBeDisabled();
    await user.type(view.getByLabelText('Password'), '1');
    await user.type(view.getByLabelText('Password (Again)'), '1');
    expect(view.getByRole('button', { name: 'Register' })).toBeEnabled();
    expect(registrations(fetchMock)).toHaveLength(0);
  });

  it('marks the rules the server says a password broke, until it is changed', async () => {
    serve(
      () =>
        new Response('{"detail":{"message":"Password does not meet the policy","failed":["require_digit"]}}', {
          status: HTTP_UNPROCESSABLE,
        }),
    );
    const user = userEvent.setup();
    const view = renderRegister();
    await view.findByRole('list', { name: 'Password requirements' });
    await typePasswords(user, 'abcdefg1', 'abcdefg1');
    await user.click(view.getByRole('button', { name: 'Register' }));
    expect(await view.findByText('Password does not meet the policy')).toBeInTheDocument();
    expect(view.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true');
    expect(view.getByText(/At least one digit/)).toHaveTextContent('At least one digit: not met yet');
    await user.type(view.getByLabelText('Password'), '2');
    expect(view.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'false');
  });

  it('keeps its optional props', () => {
    expectTypeOf<RegisterProps>().toEqualTypeOf<{ additionalFields?: string[]; userRegisterEndpoint?: string }>();
  });
});
