// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Meta, StoryObj } from '@storybook/react';
import { SWRConfig, unstable_serialize } from 'swr';
import { TEST_AUTH_SERVER } from '../../tests/fixtures/authConfig';
import { API_KEYS_ENDPOINT, type ApiKey, ApiKeys } from './ApiKeys';

const withKeys =
  (keys: ApiKey[]) =>
  (Story: () => React.JSX.Element): React.JSX.Element => (
    <SWRConfig
      value={{ provider: () => new Map(), fallback: { [unstable_serialize([TEST_AUTH_SERVER, API_KEYS_ENDPOINT])]: keys } }}
    >
      <Story />
    </SWRConfig>
  );

const meta: Meta<typeof ApiKeys> = {
  title: 'Auth/Management/ApiKeys',
  component: ApiKeys,
  parameters: { layout: 'padded' },
};
export default meta;

type Story = StoryObj<typeof ApiKeys>;

export const Loading: Story = {};

export const None: Story = { decorators: [withKeys([])] };

export const TwoKeys: Story = {
  decorators: [
    withKeys([
      { id: 'k1', name: 'CI', created_at: '2026-09-01T00:00:00Z', last_used_at: '2026-09-29T10:00:00Z', expires_at: null },
      { id: 'k2', name: 'Deploy', created_at: '2026-09-10T00:00:00Z', expires_at: '2026-12-31T23:59:59Z' },
    ]),
  ],
};
