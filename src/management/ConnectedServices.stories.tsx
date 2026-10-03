// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Meta, StoryObj } from '@storybook/react';
import { ConnectedServices } from './ConnectedServices';

const meta: Meta<typeof ConnectedServices> = {
  title: 'Auth/Management/ConnectedServices',
  component: ConnectedServices,
  parameters: {
    nextjs: { appDirectory: true },
    layout: 'centered',
  },
};
export default meta;

type Story = StoryObj<typeof ConnectedServices>;

// ConnectedServices reads the configured identity providers and the user's
// linked identities from /v1/auth/oauth. With no server behind the story it
// shows the load failure.

export const Default: Story = {
  args: {},
};
