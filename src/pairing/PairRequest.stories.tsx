// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Meta, StoryObj } from '@storybook/react';
import { testAuthConfig } from '../../tests/fixtures/authConfig';
import { AuthenticationContext } from '../AuthenticationContext';
import PairRequest from './PairRequest';

// With no API to answer, the page makes no code and offers to start again.
const meta: Meta<typeof PairRequest> = {
  title: 'Auth/PairRequest',
  component: PairRequest,
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

type Story = StoryObj<typeof PairRequest>;

export const WithoutServer: Story = {};
