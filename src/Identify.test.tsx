// SPDX-License-Identifier: AGPL-3.0-or-later
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { testAuthConfig } from '../tests/fixtures/authConfig';
import { AuthenticationContext } from './AuthenticationContext';
import Identify, { type IdentifyProps } from './Identify';

vi.mock('next/navigation.js', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/user' }));

const renderIdentify = (): ReturnType<typeof render> =>
  render(
    <AuthenticationContext value={testAuthConfig}>
      <Identify />
    </AuthenticationContext>,
  );

describe('Identify', () => {
  it('labels the email field, and announces a bad address on it', async () => {
    const user = userEvent.setup();
    const view = renderIdentify();
    const email = view.getByLabelText('E-Mail Address');
    expect(email).toHaveAttribute('aria-invalid', 'false');
    await user.type(email, 'not-an-address');
    await user.click(view.getByRole('button', { name: 'Continue with Email' }));
    expect(await view.findByText('Please enter a valid E-Mail address.')).toBeInTheDocument();
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAccessibleDescription('Please enter a valid E-Mail address.');
  });

  it('links each other way to sign in the app mounts, under the auth path', () => {
    expect(renderIdentify().queryAllByRole('link')).toEqual([]);
    const view = render(
      <AuthenticationContext
        value={{
          ...testAuthConfig,
          signInAlternatives: [
            { label: 'Sign in with another device', path: '/pair' },
            { label: 'Use a passkey', path: '/passkey' },
          ],
        }}
      >
        <Identify />
      </AuthenticationContext>,
    );
    expect(view.getByRole('link', { name: 'Sign in with another device' })).toHaveAttribute('href', '/user/pair');
    expect(view.getByRole('link', { name: 'Use a passkey' })).toHaveAttribute('href', '/user/passkey');
  });

  it('keeps its two optional config props', () => {
    expectTypeOf<IdentifyProps>().toEqualTypeOf<{
      redirectToOnExists?: string;
      redirectToOnNotExists?: string;
    }>();
  });
});
