// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from 'storybook/test';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

const meta: Meta<typeof Popover> = {
  title: 'UI/Popover',
  component: Popover,
};
export default meta;

type Story = StoryObj<typeof Popover>;

export const Default: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger>Open</PopoverTrigger>
      <PopoverContent>
        <p className='text-sm'>Popover content goes here.</p>
      </PopoverContent>
    </Popover>
  ),
};

export const RichContent: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger>Profile</PopoverTrigger>
      <PopoverContent className='w-80'>
        <div className='flex flex-col space-y-2'>
          <h4 className='text-sm font-semibold'>Jane Doe</h4>
          <p className='text-xs text-muted-foreground'>jane@example.com</p>
        </div>
      </PopoverContent>
    </Popover>
  ),
};

export const AlignStart: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger>Aligned start</PopoverTrigger>
      <PopoverContent align='start'>Top-left aligned content.</PopoverContent>
    </Popover>
  ),
};

export const DefaultOpen: Story = {
  render: () => (
    <Popover defaultOpen>
      <PopoverTrigger>Already open</PopoverTrigger>
      <PopoverContent>I render visible by default.</PopoverContent>
    </Popover>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // defaultOpen mounts the content into a portal so we just verify the
    // trigger is rendered and clickable.
    const trigger = canvas.getByText('Already open');
    await expect(trigger).toBeInTheDocument();
    await userEvent.click(trigger);
  },
};
