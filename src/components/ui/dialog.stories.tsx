// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Meta, StoryObj } from '@storybook/react';
import { expect, screen, userEvent, within } from 'storybook/test';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './dialog';

const meta: Meta<typeof Dialog> = {
  title: 'UI/Dialog',
  component: Dialog,
};
export default meta;

type Story = StoryObj<typeof Dialog>;

export const Default: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger>Open dialog</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>This action cannot be undone.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button type='button'>Cancel</button>
          <button type='button'>Continue</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByText('Open dialog');
    await userEvent.click(trigger);
    // Radix renders the content into a portal at document.body, so query
    // the body-level screen rather than the canvas.
    const title = await screen.findByText('Are you sure?');
    await expect(title).toBeInTheDocument();
  },
};

export const DefaultOpen: Story = {
  render: () => (
    <Dialog defaultOpen>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mounted open</DialogTitle>
          <DialogDescription>This dialog renders open on mount.</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  ),
};

export const NoDescription: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger>Quick action</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quick confirmation</DialogTitle>
        </DialogHeader>
        <p className='text-sm'>Are you sure you want to proceed?</p>
      </DialogContent>
    </Dialog>
  ),
};
