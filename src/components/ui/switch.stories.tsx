// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from 'storybook/test';
import { Switch } from './switch';

const meta: Meta<typeof Switch> = {
  title: 'UI/Switch',
  component: Switch,
};
export default meta;

type Story = StoryObj<typeof Switch>;

export const Default: Story = {
  args: { id: 'sw-default' },
};

export const Checked: Story = {
  args: { id: 'sw-checked', defaultChecked: true },
};

export const Disabled: Story = {
  args: { id: 'sw-disabled', disabled: true },
};

export const Interaction: Story = {
  args: { 'id': 'sw-toggle', 'aria-label': 'enable notifications' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const sw = canvas.getByRole('switch', { name: 'enable notifications' });
    await expect(sw).toHaveAttribute('data-state', 'unchecked');
    await userEvent.click(sw);
    await expect(sw).toHaveAttribute('data-state', 'checked');
  },
};
