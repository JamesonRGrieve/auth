// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Meta, StoryObj } from '@storybook/react';
import { testAuthConfig } from '../../tests/fixtures/authConfig';
import { AuthenticationContext } from '../AuthenticationContext';
import PairApprove from './PairApprove';

// Opened without a `?token=`, the page explains the link is incomplete.
const meta: Meta<typeof PairApprove> = {
  title: 'Auth/PairApprove',
  component: PairApprove,
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

type Story = StoryObj<typeof PairApprove>;

export const WithoutToken: Story = {};
