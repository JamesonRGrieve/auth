// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Meta, StoryObj } from '@storybook/react';
import { PasskeySignIn } from './PasskeySignIn';

const meta: Meta<typeof PasskeySignIn> = {
  title: 'Auth/WebAuthn/PasskeySignIn',
  component: PasskeySignIn,
  parameters: { layout: 'centered' },
};
export default meta;

type Story = StoryObj<typeof PasskeySignIn>;

// Signing in needs a backing API and an authenticator; the button shows where the browser has passkeys.

export const AnyPasskey: Story = { args: { email: null, onSignedIn: () => undefined } };

export const TheAccountsPasskey: Story = { args: { email: 'ada@example.com', onSignedIn: () => undefined } };
