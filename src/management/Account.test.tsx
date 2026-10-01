// SPDX-License-Identifier: AGPL-3.0-or-later
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AuthApiError } from '../lib/api';
import type { PasswordPolicy } from '../lib/passwordPolicy';
import { Account } from './Account';

type View = ReturnType<typeof render>;

const HTTP_UNPROCESSABLE = 422;
const POLICY: PasswordPolicy = { min_length: 8, max_bytes: 72, require_letter: true, require_digit: true };

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
    const view = render(<Account onChangePassword={onChangePassword} passwordPolicy={undefined} />);
    await fill(view, 'old-secret', 'new-secret', 'new-secret');
    expect(onChangePassword).toHaveBeenCalledWith('old-secret', 'new-secret');
    expect(await view.findByRole('status')).toHaveTextContent('Password changed successfully');
    expect(view.getByLabelText('Current password')).toHaveValue('');
    expect(view.getByLabelText('New password')).toHaveValue('');
  });

  it('stops a mismatched confirmation before it reaches the server', async () => {
    const onChangePassword = vi.fn(async () => Promise.resolve(''));
    const view = render(<Account onChangePassword={onChangePassword} passwordPolicy={undefined} />);
    await fill(view, 'old-secret', 'new-secret', 'new-secert');
    expect(onChangePassword).not.toHaveBeenCalled();
    expect(view.getByRole('alert')).toHaveTextContent('The new passwords do not match.');
    const again = view.getByLabelText('New password (again)');
    expect(again).toHaveAttribute('aria-invalid', 'true');
    expect(again).toHaveAccessibleDescription('The new passwords do not match.');
    expect(view.getByLabelText('New password')).toHaveAttribute('aria-invalid', 'false');
    expect(view.getByLabelText('New password')).not.toHaveAttribute('aria-describedby');
  });

  it('marks a missing current password on that field', async () => {
    const view = render(<Account onChangePassword={vi.fn(async () => Promise.resolve(''))} passwordPolicy={undefined} />);
    await fill(view, '', 'new-secret', 'new-secret');
    const current = view.getByLabelText('Current password');
    expect(current).toHaveAttribute('aria-invalid', 'true');
    expect(current).toHaveAccessibleDescription('Enter your current password.');
  });

  it('shows the server’s refusal', async () => {
    const onChangePassword = vi.fn(async () => Promise.reject(new Error('Current password is incorrect')));
    const view = render(<Account onChangePassword={onChangePassword} passwordPolicy={undefined} />);
    await fill(view, 'wrong', 'new-secret', 'new-secret');
    expect(await view.findByRole('alert')).toHaveTextContent('Current password is incorrect');
    // The server does not say which field is wrong, so every field is described by it and none blamed.
    const current = view.getByLabelText('Current password');
    expect(current).toHaveAccessibleDescription('Current password is incorrect');
    expect(current).toHaveAttribute('aria-invalid', 'false');
  });

  it('describes the new password with the server’s rule, following what is typed', async () => {
    const view = render(<Account onChangePassword={vi.fn(async () => Promise.resolve(''))} passwordPolicy={POLICY} />);
    const next = view.getByLabelText('New password');
    expect(next).toHaveAccessibleDescription(/At least 8 characters/);
    await userEvent.setup().type(next, 'abcdefgh');
    expect(view.getByRole('list', { name: 'Password requirements' })).toHaveTextContent('At least one digit: not met yet');
  });

  it('stops a new password that breaks the policy before it reaches the server', async () => {
    const onChangePassword = vi.fn(async () => Promise.resolve(''));
    const view = render(<Account onChangePassword={onChangePassword} passwordPolicy={POLICY} />);
    await fill(view, 'old-secret', 'abcdefgh', 'abcdefgh');
    expect(onChangePassword).not.toHaveBeenCalled();
    expect(view.getByRole('alert')).toHaveTextContent('The new password does not meet the requirements.');
    expect(view.getByLabelText('New password')).toHaveAttribute('aria-invalid', 'true');
  });

  it('marks the rules the server says the new password broke', async () => {
    const refusal = new AuthApiError(HTTP_UNPROCESSABLE, 'Password does not meet the policy', ['require_digit']);
    const view = render(<Account onChangePassword={vi.fn(async () => Promise.reject(refusal))} passwordPolicy={POLICY} />);
    await fill(view, 'old-secret', 'abcdefg1', 'abcdefg1');
    expect(await view.findByRole('alert')).toHaveTextContent('Password does not meet the policy');
    expect(view.getByLabelText('New password')).toHaveAttribute('aria-invalid', 'true');
    expect(view.getByText(/At least one digit/)).toHaveTextContent('At least one digit: not met yet');
  });
});
