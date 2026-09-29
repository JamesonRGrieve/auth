// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Meta, StoryObj } from '@storybook/react';
import { SWRConfig } from 'swr';
import { MfaSettings } from './MfaSettings';
import { MFA_ENDPOINT, type MfaMethod } from './mfaApi';

const SERVER = 'https://api.example.com';

// Storybook has no API; each story seeds the method list SWR would load, so the
// states render. Actions need a real server.
const withMethods =
  (methods: MfaMethod[]) =>
  (Story: () => React.JSX.Element): React.JSX.Element => (
    <SWRConfig value={{ provider: () => new Map(), fallback: { [`${SERVER}${MFA_ENDPOINT}`]: methods } }}>
      <Story />
    </SWRConfig>
  );

const totp = (overrides: Partial<MfaMethod>): MfaMethod => ({
  id: 'm1',
  method_type: 'totp',
  is_enabled: true,
  is_primary: true,
  verification: true,
  ...overrides,
});

const meta: Meta<typeof MfaSettings> = {
  title: 'Auth/MFA/MfaSettings',
  component: MfaSettings,
  args: { authServer: SERVER },
  parameters: { layout: 'padded' },
};
export default meta;

type Story = StoryObj<typeof MfaSettings>;

export const NotSetUp: Story = { decorators: [withMethods([])] };

export const Enrolled: Story = { decorators: [withMethods([totp({})])] };

export const SetupNotFinished: Story = { decorators: [withMethods([totp({ verification: false, is_primary: false })])] };

export const TurnedOff: Story = { decorators: [withMethods([totp({ is_enabled: false, is_primary: false })])] };
