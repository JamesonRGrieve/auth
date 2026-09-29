// SPDX-License-Identifier: AGPL-3.0-or-later
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Account } from './Account';

type View = ReturnType<typeof render>;

const fill = async (view: View, current: string, next: string, again: string): Promise<void> => {
  const user = userEvent.setup();
  if (current !== '') {
    await user.type(view.getByLabelText('Current password'), current);
  }
  if (next !== '') {
    await user.type(view.getByLabelText('New password'), next);
  }
  if (again !== '') {
    await user.type(view.getByLabelText('New password (again)'), again);
  }
  await user.click(view.getByRole('button', { name: 'Change password' }));
};

describe('Account', () => {
  it('sends the current and new password, then clears the form', async () => {
    const onChangePassword = vi.fn(async () => Promise.resolve('Password changed successfully'));
    const view = render(<Account onChangePassword={onChangePassword} />);
    await fill(view, 'old-secret', 'new-secret', 'new-secret');
    expect(onChangePassword).toHaveBeenCalledWith('old-secret', 'new-secret');
    expect(await view.findByRole('status')).toHaveTextContent('Password changed successfully');
    expect(view.getByLabelText('Current password')).toHaveValue('');
  });

  it('stops a mismatched confirmation before it reaches the server', async () => {
    const onChangePassword = vi.fn(async () => Promise.resolve(''));
    const view = render(<Account onChangePassword={onChangePassword} />);
    await fill(view, 'old-secret', 'new-secret', 'new-secert');
    expect(onChangePassword).not.toHaveBeenCalled();
    expect(view.getByRole('alert')).toHaveTextContent('The new passwords do not match.');
  });

  it('shows the server’s refusal', async () => {
    const onChangePassword = vi.fn(async () => Promise.reject(new Error('Current password is incorrect')));
    const view = render(<Account onChangePassword={onChangePassword} />);
    await fill(view, 'wrong', 'new-secret', 'new-secret');
    expect(await view.findByRole('alert')).toHaveTextContent('Current password is incorrect');
  });
});
