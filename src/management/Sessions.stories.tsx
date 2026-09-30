// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Meta, StoryObj } from '@storybook/react';
import { SWRConfig, unstable_serialize } from 'swr';
import { TEST_AUTH_SERVER } from '../../tests/fixtures/authConfig';
import { type Session, Sessions, SESSIONS_ENDPOINT } from './Sessions';

const withSessions =
  (sessions: Session[]) =>
  (Story: () => React.JSX.Element): React.JSX.Element => (
    <SWRConfig
      value={{
        provider: () => new Map(),
        fallback: { [unstable_serialize([TEST_AUTH_SERVER, SESSIONS_ENDPOINT])]: sessions },
      }}
    >
      <Story />
    </SWRConfig>
  );

const meta: Meta<typeof Sessions> = {
  title: 'Auth/Management/Sessions',
  component: Sessions,
  parameters: { layout: 'padded' },
};
export default meta;

type Story = StoryObj<typeof Sessions>;

export const Loading: Story = {};

export const TwoDevices: Story = {
  decorators: [
    withSessions([
      {
        id: 's1',
        browser: 'Firefox',
        device_type: 'desktop',
        is_active: true,
        last_activity: '2026-09-29T12:00:00Z',
        expires_at: '2026-10-29T12:00:00Z',
      },
      {
        id: 's2',
        browser: 'Safari',
        device_type: 'mobile',
        is_active: true,
        last_activity: '2026-09-28T08:30:00Z',
        expires_at: '2026-10-28T08:30:00Z',
      },
    ]),
  ],
};
