// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from 'storybook/test';
import { PasswordRules } from './PasswordRules';

const policy = { min_length: 8, max_bytes: 72, require_letter: true, require_digit: true };

const meta: Meta<typeof PasswordRules> = {
  title: 'Components/PasswordRules',
  component: PasswordRules,
  args: { id: 'password-rules', policy, password: '' },
};
export default meta;

type Story = StoryObj<typeof PasswordRules>;

export const NothingTyped: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText(/not met yet/)).toHaveLength(4);
  },
};

export const PartlyMet: Story = {
  args: { password: 'abc' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/At least one letter/)).toHaveTextContent(/^At least one letter: met$/);
    await expect(canvas.getByText(/At least one digit/)).toHaveTextContent(/^At least one digit: not met yet$/);
  },
};

export const AllMet: Story = {
  args: { password: 'correct horse 9' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText(/not met yet/)).not.toBeInTheDocument();
  },
};
