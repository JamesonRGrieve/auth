// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import { Disclosure, DisclosureContent, DisclosureTrigger } from './disclosure';

const meta: Meta<typeof Disclosure> = {
  title: 'UI/Disclosure',
  component: Disclosure,
};
export default meta;

type Story = StoryObj<typeof Disclosure>;

function Controlled({ initialOpen = false }: { initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <Disclosure open={open} onOpenChange={setOpen}>
      <DisclosureTrigger>
        <button data-testid='disclosure-trigger' className='px-3 py-1 border rounded'>
          Toggle
        </button>
      </DisclosureTrigger>
      <DisclosureContent>
        <div data-testid='disclosure-content' className='p-3'>
          Hidden content revealed.
        </div>
      </DisclosureContent>
    </Disclosure>
  );
}

export const ClosedByDefault: Story = {
  render: () => <Controlled />,
};

export const OpenByDefault: Story = {
  render: () => <Controlled initialOpen />,
};

export const InteractionToggles: Story = {
  render: () => <Controlled />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByTestId('disclosure-trigger');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(trigger);
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  },
};
