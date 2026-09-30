// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Meta, StoryObj } from '@storybook/react';
import { SWRConfig } from 'swr';
import { TEST_AUTH_SERVER as SERVER, testAuthConfig as authConfig } from '../../tests/fixtures/authConfig';
import { AuthenticationContext } from '../AuthenticationContext';
import { USER_INVITATIONS_ENDPOINT } from '../hooks/useUserInvitations';
import { PendingInvitations } from './Invitations';
import type { PendingInvitation } from './invitationsModel';

// Storybook has no API; each story seeds what SWR would load. Answering needs a real server.
const withInvitations =
  (invitations: PendingInvitation[]) =>
  (Story: () => React.JSX.Element): React.JSX.Element => (
    <AuthenticationContext value={authConfig}>
      <SWRConfig value={{ provider: () => new Map(), fallback: { [`${SERVER}${USER_INVITATIONS_ENDPOINT}`]: invitations } }}>
        <Story />
      </SWRConfig>
    </AuthenticationContext>
  );

const meta: Meta<typeof PendingInvitations> = {
  title: 'Auth/Management/PendingInvitations',
  component: PendingInvitations,
  parameters: { nextjs: { appDirectory: true }, layout: 'padded' },
};
export default meta;

type Story = StoryObj<typeof PendingInvitations>;

export const None: Story = { decorators: [withInvitations([])] };

export const Several: Story = {
  decorators: [
    withInvitations([
      {
        id: 'inv-1',
        created_at: '2026-09-20T00:00:00Z',
        expires_at: '2026-10-20T00:00:00Z',
        team: { name: 'Alpha' },
        role: { name: 'Admin' },
        invitees: [{ id: 'row-1', status: 'pending' }],
      },
      {
        id: 'inv-2',
        created_at: '2026-09-21T00:00:00Z',
        team: { name: 'Beta' },
        invitees: [{ id: 'row-2', status: 'pending' }],
      },
    ]),
  ],
};
