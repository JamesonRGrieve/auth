// SPDX-License-Identifier: AGPL-3.0-or-later
import { Button } from '@jgrieve/forms/components/ui/button';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, spyOn, userEvent, within } from 'storybook/test';
import AuthCard from './AuthCard';

const meta: Meta<typeof AuthCard> = {
  title: 'Components/AuthCard',
  component: AuthCard,
};
export default meta;

type Story = StoryObj<typeof AuthCard>;

export const Default: Story = {
  render: () => (
    <AuthCard title='Sign In' description='Please enter your credentials to sign in.'>
      <form className='space-y-4'>
        <input type='email' aria-label='Email' placeholder='Email' className='w-full px-4 py-2 border rounded' />
        <input type='password' aria-label='Password' placeholder='Password' className='w-full px-4 py-2 border rounded' />
        <Button className='w-full'>Sign In</Button>
      </form>
    </AuthCard>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Please enter your credentials to sign in.')).toBeInTheDocument();
    await expect(canvas.queryByRole('button', { name: 'Go back' })).not.toBeInTheDocument();
    await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();
  },
};

export const WithBackButton: Story = {
  render: () => (
    <AuthCard showBackButton title='Sign Up' description='Create a new account.'>
      <form className='space-y-4'>
        <input type='text' aria-label='Name' placeholder='Name' className='w-full px-4 py-2 border rounded' />
        <input type='email' aria-label='Email' placeholder='Email' className='w-full px-4 py-2 border rounded' />
        <input type='password' aria-label='Password' placeholder='Password' className='w-full px-4 py-2 border rounded' />
        <Button className='w-full'>Sign Up</Button>
      </form>
    </AuthCard>
  ),
  play: async ({ canvasElement }) => {
    const back = spyOn(window.history, 'back').mockImplementation(() => undefined);
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Go back' }));
    await expect(back).toHaveBeenCalledTimes(1);
    back.mockRestore();
  },
};

export const WithResponseMessage: Story = {
  render: () => (
    <AuthCard
      title='Reset Password'
      description='Enter your email to reset your password.'
      responseMessage='An error occurred. Please try again.'
    >
      <form className='space-y-4'>
        <input type='email' aria-label='Email' placeholder='Email' className='w-full px-4 py-2 border rounded' />
        <Button className='w-full'>Reset Password</Button>
      </form>
    </AuthCard>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('alert')).toHaveTextContent('An error occurred. Please try again.');
  },
};
