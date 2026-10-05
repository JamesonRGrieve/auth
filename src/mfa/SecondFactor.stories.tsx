// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Meta, StoryObj } from '@storybook/react';
import { SecondFactor } from './SecondFactor';

const meta: Meta<typeof SecondFactor> = {
  title: 'Auth/MFA/SecondFactor',
  component: SecondFactor,
  parameters: { layout: 'centered' },
  args: { onSignedIn: () => undefined, onStartOver: () => undefined },
};
export default meta;

type Story = StoryObj<typeof SecondFactor>;

export const CodeOnly: Story = {
  args: { challenge: { mfa_required: true, challenge_token: 'c1', methods: [{ id: 'm1', method_type: 'totp' }] } },
};

export const CodeOrSecurityKey: Story = {
  args: {
    challenge: {
      mfa_required: true,
      challenge_token: 'c1',
      methods: [
        { id: 'm1', method_type: 'totp' },
        { id: 'm2', method_type: 'webauthn' },
      ],
    },
  },
};
