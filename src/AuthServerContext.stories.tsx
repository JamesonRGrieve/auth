// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Meta, StoryObj } from '@storybook/react';
import { AuthServerProvider, useAuthServer } from './AuthServerContext';

function ShowBase() {
  const authServer = useAuthServer();
  return (
    <p className='text-sm'>
      API calls go to <code>{authServer === '' ? '(this origin)' : authServer}</code>
    </p>
  );
}

function ProviderDemo({ baseUrl }: { baseUrl: string }) {
  return (
    <AuthServerProvider baseUrl={baseUrl}>
      <ShowBase />
    </AuthServerProvider>
  );
}

const meta: Meta<typeof ProviderDemo> = {
  title: 'Auth/AuthServerProvider',
  component: ProviderDemo,
  parameters: { layout: 'centered' },
};
export default meta;

type Story = StoryObj<typeof ProviderDemo>;

export const SameOrigin: Story = { args: { baseUrl: '' } };

export const InProcessApi: Story = { args: { baseUrl: '/api' } };

export const Absolute: Story = { args: { baseUrl: 'https://api.example.com/' } };
