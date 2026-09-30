// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Meta, StoryObj } from '@storybook/react';
import Subscribe from './Subscribe';

const meta: Meta<typeof Subscribe> = {
  title: 'Auth/Subscribe',
  component: Subscribe,
  parameters: {
    nextjs: { appDirectory: true },
    layout: 'fullscreen',
  },
};
export default meta;

type Story = StoryObj<typeof Subscribe>;

// Subscribe shows Stripe's hosted pricing table when NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID is set,
// and otherwise says subscribing is not available. The stories feed it the searchParams it reads.

export const Default: Story = {
  args: { searchParams: {} },
};

export const WithEmail: Story = {
  args: { searchParams: { email: 'subscriber@example.com' } },
};

export const WithCustomerSession: Story = {
  args: { searchParams: { customer_session: 'cs_test_abc123' } },
};

export const WithRedirect: Story = {
  args: { searchParams: { redirectTo: '/account/subscription' } },
};
