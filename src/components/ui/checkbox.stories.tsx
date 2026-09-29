// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from 'storybook/test';
import { Checkbox } from './checkbox';

const meta: Meta<typeof Checkbox> = {
  title: 'UI/Checkbox',
  component: Checkbox,
};
export default meta;

type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {
  args: { id: 'cb-default' },
};

export const Checked: Story = {
  args: { id: 'cb-checked', defaultChecked: true },
};

export const Disabled: Story = {
  args: { id: 'cb-disabled', disabled: true },
};

export const Interaction: Story = {
  args: { 'id': 'cb-interaction', 'aria-label': 'toggle option' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const box = canvas.getByRole('checkbox', { name: 'toggle option' });
    await expect(box).toHaveAttribute('data-state', 'unchecked');
    await userEvent.click(box);
    await expect(box).toHaveAttribute('data-state', 'checked');
  },
};
