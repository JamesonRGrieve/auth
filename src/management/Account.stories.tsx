// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Meta, StoryObj } from '@storybook/react';
import { Account } from './Account';

const meta: Meta<typeof Account> = {
  title: 'Auth/Management/Account',
  component: Account,
  parameters: {
    nextjs: { appDirectory: true },
    layout: 'centered',
  },
};
export default meta;

type Story = StoryObj<typeof Account>;

export const Default: Story = {
  args: {
    onChangePassword: async () => Promise.resolve('Password changed successfully'),
  },
};

export const WrongCurrentPassword: Story = {
  args: {
    onChangePassword: async () => Promise.reject(new Error('Current password is incorrect')),
  },
};
