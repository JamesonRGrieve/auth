// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Meta, StoryObj } from '@storybook/react';
import Manage from './index';

const meta: Meta<typeof Manage> = {
  title: 'Auth/Management/Manage',
  component: Manage,
  parameters: {
    nextjs: { appDirectory: true },
    layout: 'fullscreen',
  },
};
export default meta;

type Story = StoryObj<typeof Manage>;

// Manage is the account page: profile, password, teams and invitations for the
// signed-in user, loaded from the configured auth server.

export const Default: Story = {
  args: {},
};

export const CustomReturnPath: Story = {
  args: { returnPath: '/dashboard' },
};
