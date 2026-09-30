// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * The sign-in pages with a same-origin API base (the app proxies /v1 to the server), the deployment
 * the cookie session is designed for. Each page checks its endpoint on mount; a check that only
 * accepted absolute URLs threw during hydration and took the whole page down.
 */
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { testAuthConfig } from '../tests/fixtures/authConfig';
import { AuthenticationContext } from './AuthenticationContext';
import Identify from './Identify';
import Login from './Login';
import Register from './Register';

vi.mock('next/navigation.js', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/user' }));

const SAME_ORIGIN_BASES = ['', '/api'];

const renderWith = (authServer: string, page: ReactNode): ReturnType<typeof render> =>
  render(<AuthenticationContext value={{ ...testAuthConfig, authServer }}>{page}</AuthenticationContext>);

describe.each(SAME_ORIGIN_BASES)('with the API at %j on the app’s origin', (authServer) => {
  it('renders the identify step', () => {
    expect(renderWith(authServer, <Identify />).getByLabelText('E-Mail Address')).toBeInTheDocument();
  });

  it('renders the login step', () => {
    expect(renderWith(authServer, <Login />).getByRole('form', { name: 'Login' })).toBeInTheDocument();
  });

  it('renders the register step', () => {
    expect(renderWith(authServer, <Register />).getByRole('button', { name: /register/i })).toBeInTheDocument();
  });
});
