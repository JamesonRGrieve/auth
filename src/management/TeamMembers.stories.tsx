// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Meta, StoryObj } from '@storybook/react';
import { TeamMembers } from './TeamMembers';

const meta: Meta<typeof TeamMembers> = {
  title: 'Auth/Management/TeamMembers',
  component: TeamMembers,
  parameters: {
    nextjs: { appDirectory: true },
    layout: 'padded',
  },
};
export default meta;

type Story = StoryObj<typeof TeamMembers>;

// Without an API behind the story no team resolves, so the choose-a-team prompt shows.
export const NoTeam: Story = {
  args: {},
};

export const NamedTeam: Story = {
  args: { teamId: '11111111-2222-3333-4444-555555555555' },
};
