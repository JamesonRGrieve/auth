// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Meta, StoryObj } from '@storybook/react';
import Identify from './Identify';

const meta: Meta<typeof Identify> = {
  title: 'Auth/Identify',
  component: Identify,
  parameters: {
    nextjs: { appDirectory: true },
    layout: 'centered',
  },
};
export default meta;

type Story = StoryObj<typeof Identify>;

// Identify is the first step in the auth funnel: it collects an email,
// hits `/v1/user/exists`, and routes the visitor to /login or /register
// based on the response. These stories pin the prop matrix without
// driving a real network response.

export const Default: Story = {
  args: {},
};

export const RedirectMatrix: Story = {
  args: {
    redirectToOnExists: '/auth/login',
    redirectToOnNotExists: '/auth/signup',
  },
};

export const WithOAuthOverrides: Story = {
  args: {
    oAuthOverrides: {
      Google: { scope: 'profile email openid' },
    },
  },
};
