// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Meta, StoryObj } from '@storybook/react';
import { MfaChallenge } from './MfaChallenge';

const meta: Meta<typeof MfaChallenge> = {
  title: 'Auth/MFA/MfaChallenge',
  component: MfaChallenge,
  parameters: { layout: 'centered' },
};
export default meta;

type Story = StoryObj<typeof MfaChallenge>;

export const Accepts: Story = {
  args: { onSubmit: async () => Promise.resolve(null), onStartOver: () => undefined },
};

export const RefusesTheCode: Story = {
  args: { onSubmit: async () => Promise.resolve('Invalid MFA code'), onStartOver: () => undefined },
};
