// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Meta, StoryObj } from '@storybook/react';
import { CopyButton } from './CopyButton';

const meta: Meta<typeof CopyButton> = {
  title: 'Auth/CopyButton',
  component: CopyButton,
  parameters: { layout: 'centered' },
};
export default meta;

type Story = StoryObj<typeof CopyButton>;

export const Default: Story = {
  args: { content: 'KEY123' },
};

export const Labelled: Story = {
  args: { content: 'AAAAA-11111\nBBBBB-22222', label: 'Copy codes' },
};
