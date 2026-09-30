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

  it('offers signing in with another device only when pairing is on', () => {
    expect(renderIdentify().queryByRole('link', { name: 'Sign in with another device' })).toBeNull();
    const view = render(
      <AuthenticationContext value={{ ...testAuthConfig, authModes: { ...testAuthConfig.authModes, pairing: true } }}>
        <Identify />
      </AuthenticationContext>,
    );
    expect(view.getByRole('link', { name: 'Sign in with another device' })).toHaveAttribute('href', '/user/pair');
  });

  it('keeps its two optional config props', () => {
    expectTypeOf<IdentifyProps>().toEqualTypeOf<{
      redirectToOnExists?: string;
      redirectToOnNotExists?: string;
    }>();
  });
});
