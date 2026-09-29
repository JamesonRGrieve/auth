// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Meta, StoryObj } from '@storybook/react';
import Login from './Login';

const meta: Meta<typeof Login> = {
  title: 'Auth/Login',
  component: Login,
  parameters: {
    nextjs: { appDirectory: true },
    layout: 'centered',
  },
};
export default meta;

type Story = StoryObj<typeof Login>;

// Login is the password step; an account with a second factor continues to the
// MfaChallenge step (see Auth/MFA/MfaChallenge). Live submission needs a backing API.

export const Default: Story = {
  args: {},
};

export const CustomEndpoint: Story = {
  args: { userLoginEndpoint: '/v2/user/authorize' },
};
