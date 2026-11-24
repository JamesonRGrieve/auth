// SPDX-License-Identifier: AGPL-3.0-or-later
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { testAuthConfig } from '../tests/fixtures/authConfig';
import { AuthenticationContext } from './AuthenticationContext';
import Identify, { type IdentifyProps, NO_ACCOUNT } from './Identify';

const push = vi.hoisted(() => vi.fn());
vi.mock('next/navigation.js', () => ({ useRouter: () => ({ push }), usePathname: () => '/user' }));

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
    const email = view.getByLabelText('Email');
    expect(email).toHaveAttribute('aria-invalid', 'false');
    await user.type(email, 'not-an-address');
    await user.click(view.getByRole('button', { name: 'Continue with Email' }));
    expect(await view.findByText('Enter a valid email address.')).toBeInTheDocument();
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAccessibleDescription('Enter a valid email address.');
  });

  it('offers only single sign-on, without mentioning email, when email sign-in is off', () => {
    const view = render(
      <AuthenticationContext
        value={{
          ...testAuthConfig,
          authModes: { basic: false, magical: false, passkey: false },
          oauthProviders: ['oidc'],
          oauthLabels: { oidc: 'Boden Research' },
        }}
      >
        <Identify />
      </AuthenticationContext>,
    );
    expect(
      view.getByText('Sign in with your Boden Research account. First time here? That sets you up.'),
    ).toBeInTheDocument();
    expect(view.queryByLabelText('Email')).toBeNull();
    // The only way in is the page's main action, not an outline button.
    expect(view.getByRole('button', { name: 'Continue with Boden Research' })).not.toHaveClass('bg-transparent');
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

  describe('with sign-up closed', () => {
    const HTTP_CONFLICT = 409;
    const HTTP_FORBIDDEN = 403;
    afterEach(() => {
      vi.unstubAllGlobals();
      push.mockClear();
    });
    const closed = (status: number): ReturnType<typeof render> => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => Promise.resolve(new Response('{"detail":"x"}', { status }))),
      );
      return render(
        <AuthenticationContext value={{ ...testAuthConfig, signupOpen: false }}>
          <Identify />
        </AuthenticationContext>,
      );
    };
    const submit = async (view: ReturnType<typeof render>): Promise<void> => {
      const user = userEvent.setup();
      await user.type(view.getByLabelText('Email'), 'sam@example.com');
      await user.click(view.getByRole('button', { name: 'Continue with Email' }));
    };

    it('offers sign-in only', () => {
      const view = closed(HTTP_CONFLICT);
      expect(view.getByText('Enter your email to sign in.')).toBeInTheDocument();
      expect(view.queryByText(/create an account/u)).toBeNull();
      // No waitlist named, so no link to one.
      expect(view.queryByRole('link', { name: 'Join the waitlist' })).toBeNull();
    });

    it('links to the app’s waitlist when it names one', () => {
      vi.stubGlobal('fetch', vi.fn());
      const view = render(
        <AuthenticationContext value={{ ...testAuthConfig, signupOpen: false, waitlistPath: '/waitlist' }}>
          <Identify />
        </AuthenticationContext>,
      );
      expect(view.getByRole('link', { name: 'Join the waitlist' })).toHaveAttribute('href', '/waitlist');
    });

    it('tells a new address it has no account, rather than sending it to sign up', async () => {
      const view = closed(HTTP_FORBIDDEN);
      await submit(view);
      expect(await view.findByText(NO_ACCOUNT)).toBeInTheDocument();
      expect(push).not.toHaveBeenCalled();
    });

    it('still takes an address with an account on to sign in', async () => {
      const view = closed(HTTP_CONFLICT);
      await submit(view);
      await vi.waitFor(() => {
        expect(push).toHaveBeenCalledWith('/user/login');
      });
    });
  });

  it('keeps its two optional config props', () => {
    expectTypeOf<IdentifyProps>().toEqualTypeOf<{
      redirectToOnExists?: string;
      redirectToOnNotExists?: string;
    }>();
  });
});
