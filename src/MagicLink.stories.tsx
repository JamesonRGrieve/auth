// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Meta, StoryObj } from '@storybook/react';
import { testAuthConfig } from '../tests/fixtures/authConfig';
import { AuthenticationContext } from './AuthenticationContext';
import MagicLink from './MagicLink';

// Opened without a `?token=`, the landing page explains the link is incomplete.
const meta: Meta<typeof MagicLink> = {
  title: 'Auth/MagicLink',
  component: MagicLink,
  parameters: { layout: 'centered', nextjs: { appDirectory: true } },
  decorators: [
    (Story) => (
      <AuthenticationContext value={testAuthConfig}>
        <Story />
      </AuthenticationContext>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof MagicLink>;

export const WithoutToken: Story = {};
