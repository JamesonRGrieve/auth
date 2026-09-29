// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Meta, StoryObj } from '@storybook/react';
import VerifyEmail from './EMail';

const meta: Meta<typeof VerifyEmail> = {
  title: 'Auth/MFA/Email',
  component: VerifyEmail,
  parameters: {
    nextjs: { appDirectory: true },
    layout: 'centered',
  },
};
export default meta;

type Story = StoryObj<typeof VerifyEmail>;

export const Default: Story = {
  args: {
    // A no-op default that still satisfies the callback's type contract.
    verifiedCallback: (_verified: boolean) => undefined,
  },
};

export const RecordingCallback: Story = {
  args: {
    verifiedCallback: (verified: boolean) => {
      window.dispatchEvent(new CustomEvent('mfa-email-verified', { detail: verified }));
    },
  },
};

export const InCardLayout: Story = {
  render: () => (
    <div style={{ maxWidth: 360, padding: 24, border: '1px solid var(--border)', borderRadius: 8 }}>
      <VerifyEmail verifiedCallback={() => undefined} />
    </div>
  ),
};
