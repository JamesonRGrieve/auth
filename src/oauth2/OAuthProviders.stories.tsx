// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Meta, StoryObj } from '@storybook/react';
import { oauth2ProviderDisplay } from './OAuthProviders';

function ProvidersCatalog({ names }: { names: string[] }) {
  return (
    <ul className='grid gap-2' style={{ listStyle: 'none', padding: 0 }}>
      {names.map((name) => {
        const { label, icon } = oauth2ProviderDisplay(name);
        return (
          <li key={name} className='flex items-center gap-2 rounded-md border p-2 text-sm'>
            <span aria-hidden style={{ display: 'inline-flex', width: 18, height: 18 }}>
              {icon}
            </span>
            <span className='font-medium'>{label}</span>
          </li>
        );
      })}
    </ul>
  );
}

const meta: Meta<typeof ProvidersCatalog> = {
  title: 'Auth/OAuth/Providers',
  component: ProvidersCatalog,
};
export default meta;

type Story = StoryObj<typeof ProvidersCatalog>;

export const Supported: Story = {
  args: { names: ['google', 'github', 'microsoft', 'amazon', 'forgejo'] },
};

export const Unknown: Story = {
  args: { names: ['keycloak'] },
};
