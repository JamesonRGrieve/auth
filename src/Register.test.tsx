// SPDX-License-Identifier: AGPL-3.0-or-later
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { deleteCookie, getCookie, setCookie } from 'cookies-next/client';
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { TEST_AUTH_SERVER as SERVER, testAuthConfig } from '../tests/fixtures/authConfig';
import { AuthenticationContext } from './AuthenticationContext';
import Register, { type RegisterProps } from './Register';

const push = vi.fn();
vi.mock('next/navigation.js', () => ({ useRouter: () => ({ push }) }));

const HTTP_CREATED = 201;
const HTTP_CONFLICT = 409;

const renderRegister = (): ReturnType<typeof render> =>
  render(
    <AuthenticationContext value={testAuthConfig}>
      <Register />
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
    const fetchMock = vi.fn(async () => Promise.resolve(new Response('{}', { status: HTTP_CREATED })));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    const view = renderRegister();
    expect(view.getByText(/invited to join Alpha/)).toBeInTheDocument();
    await typePasswords(user, 'correct horse', 'correct horse');
    await user.click(view.getByRole('button', { name: 'Accept Invitation' }));
    await vi.waitFor(() => {
      expect(push).toHaveBeenCalledWith('/user/login');
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      `${SERVER}/v1/user`,
      expect.objectContaining({
        body: JSON.stringify({ user: { email: 'ada@example.com', password: 'correct horse', invitation_code: 'inv-1' } }),
      }),
    );
    expect(getCookie('invitation')).toBeUndefined();
  });

  it('shows the server’s refusal and lets the user try again', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Promise.resolve(new Response('{"detail":"A user with this email already exists"}', { status: HTTP_CONFLICT })),
      ),
    );
    const user = userEvent.setup();
    const view = renderRegister();
    await typePasswords(user, 'pw-12345678', 'pw-12345678');
    await user.click(view.getByRole('button', { name: 'Register' }));
    expect(await view.findByText('A user with this email already exists')).toBeInTheDocument();
    expect(view.getByRole('button', { name: 'Register' })).toBeEnabled();
  });

  it('keeps its optional props', () => {
    expectTypeOf<RegisterProps>().toEqualTypeOf<{ additionalFields?: string[]; userRegisterEndpoint?: string }>();
  });
});
