// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Meta, StoryObj } from '@storybook/react';
import { type ReactNode, useContext } from 'react';
import { AuthenticationContext } from './AuthenticationContext';
import type { AuthenticationConfig } from './Router';

// A tiny preview component that reads the context so the stories visualise
// the contract: a Provider injects a config object; consumers receive the
// same reference back.
const ContextPreview = ({ label }: { label: string }): ReactNode => {
  const config = useContext(AuthenticationContext);
  return (
    <div style={{ fontFamily: 'monospace', padding: 12, border: '1px solid #ccc', borderRadius: 4 }}>
      <strong>{label}</strong>
      <pre style={{ whiteSpace: 'pre-wrap' }}>
        {config === undefined
          ? '// context is undefined (no Provider above this consumer)'
          : JSON.stringify({ appName: config.appName, authServer: config.authServer, authModes: config.authModes }, null, 2)}
      </pre>
    </div>
  );
};

const meta: Meta<typeof ContextPreview> = {
  title: 'Auth/AuthenticationContext',
  component: ContextPreview,
  parameters: {
    docs: {
      description: {
        component:
          'AuthenticationContext is a React Context that carries the merged auth config (paths, headings, auth modes, server URL) to every nested auth component. The default value is `undefined` so consumers can detect a missing Provider.',
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof ContextPreview>;

const sampleConfig: AuthenticationConfig = {
  identify: { path: '/', heading: 'Welcome' },
  login: { path: '/login', heading: 'Please Authenticate' },
  manage: { path: '/manage', heading: 'Account Management' },
  register: { path: '/register', heading: 'Register' },
  close: { path: '/close', heading: '' },
  magic: { path: '/magic', heading: '' },
  pair: { path: '/pair/approve', heading: '' },
  pairRequest: { path: '/pair', heading: '' },
  subscribe: { path: '/subscribe', heading: 'Subscribe' },
  logout: { path: '/logout', heading: '', props: {} },
  ou: { path: '/ou', heading: 'OU' },
  error: { path: '/error', heading: 'Error' },
  authModes: { basic: true, magical: false },
  oauthProviders: [],
  authServer: 'https://api.example.com',
  appName: 'Storybook',
  authPath: '/user',
  enableOU: false,
};

export const WithoutProvider: Story = {
  args: { label: 'No Provider — useContext returns undefined' },
};

export const WithProvider: Story = {
  render: (args) => (
    <AuthenticationContext.Provider value={sampleConfig}>
      <ContextPreview {...args} />
    </AuthenticationContext.Provider>
  ),
  args: { label: 'Provider supplies a config object' },
};

export const NestedProvidersOverride: Story = {
  render: (args) => (
    <AuthenticationContext.Provider value={sampleConfig}>
      <AuthenticationContext.Provider value={{ ...sampleConfig, appName: 'Inner' }}>
        <ContextPreview {...args} />
      </AuthenticationContext.Provider>
    </AuthenticationContext.Provider>
  ),
  args: { label: 'Inner Provider shadows the outer one (appName=Inner)' },
};
