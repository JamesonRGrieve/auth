// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Meta, StoryObj } from '@storybook/react';
import AuthRouter from './Router';

const meta: Meta<typeof AuthRouter> = {
  title: 'Auth/Router',
  component: AuthRouter,
  parameters: {
    nextjs: { appDirectory: true },
    layout: 'fullscreen',
  },
};
export default meta;

type Story = StoryObj<typeof AuthRouter>;

// AuthRouter is the slug-driven page dispatcher; each story below
// pins one of the canonical sub-pages it can render based on the
// params.slug array.

export const IdentifyPage: Story = {
  args: { params: { slug: [] } },
};

export const LoginPage: Story = {
  args: { params: { slug: ['login'] } },
};

export const RegisterPage: Story = {
  args: { params: { slug: ['register'] } },
};

export const LogoutPage: Story = {
  args: { params: { slug: ['logout'] } },
};

export const ErrorPage: Story = {
  args: { params: { slug: ['error'] } },
};

export const WithAdditionalPages: Story = {
  args: {
    params: { slug: ['custom'] },
    additionalPages: { '/custom': null },
  },
};
