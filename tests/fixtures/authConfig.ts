// SPDX-License-Identifier: AGPL-3.0-or-later
import type { AuthenticationConfig } from '../../src/Router';

export const TEST_AUTH_SERVER = 'https://api.example.com';

/** A complete AuthenticationConfig for tests and stories: basic (password) mode against TEST_AUTH_SERVER. */
export const testAuthConfig: AuthenticationConfig = {
  identify: { path: '/', heading: 'Welcome' },
  login: { path: '/login', heading: 'Please Authenticate' },
  manage: { path: '/manage', heading: 'Account Management' },
  register: { path: '/register', heading: 'Welcome, Please Register' },
  close: { path: '/close', heading: '' },
  subscribe: { path: '/subscribe', heading: 'Please Subscribe' },
  logout: { path: '/logout', heading: '', props: { redirectTo: '/' } },
  ou: { path: '/ou', heading: 'OU' },
  error: { path: '/error', heading: 'Error' },
  appName: 'Test',
  authBaseURI: 'https://auth.example.com',
  authServer: TEST_AUTH_SERVER,
  authModes: { basic: true, oauth2: false, magical: false },
  enableOU: false,
};
