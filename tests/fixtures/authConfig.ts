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
  magic: { path: '/magic', heading: '' },
  pair: { path: '/pair/approve', heading: '' },
  subscribe: { path: '/subscribe', heading: 'Please Subscribe' },
  logout: { path: '/logout', heading: '', props: { redirectTo: '/' } },
  ou: { path: '/ou', heading: 'OU' },
  error: { path: '/error', heading: 'Error' },
  appName: 'Test',
  authPath: '/user',
  authServer: TEST_AUTH_SERVER,
  authModes: { basic: true, magical: false },
  oauthProviders: [],
  enableOU: false,
};
