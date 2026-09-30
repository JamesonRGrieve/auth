// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Meta, StoryObj } from '@storybook/react';
import { testAuthConfig } from '../../tests/fixtures/authConfig';
import { AuthenticationContext } from '../AuthenticationContext';
import OAuth from './OAuth';

function OAuthWith({ oauthProviders }: { oauthProviders: string[] }) {
  return (
    <AuthenticationContext value={{ ...testAuthConfig, oauthProviders }}>
      <OAuth />
    </AuthenticationContext>
  );
}

const meta: Meta<typeof OAuthWith> = {
  title: 'Auth/OAuth/OAuth',
  component: OAuthWith,
  parameters: {
    nextjs: { appDirectory: true },
    docs: {
      description: {
        component: 'A sign-in button per identity provider the app lists in `oauthProviders`; none renders nothing.',
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof OAuthWith>;

export const None: Story = {
  args: { oauthProviders: [] },
};

export const Google: Story = {
  args: { oauthProviders: ['google'] },
};

export const Several: Story = {
  args: { oauthProviders: ['google', 'github', 'microsoft'] },
};
