// SPDX-License-Identifier: AGPL-3.0-or-later
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MfaChallenge } from './MfaChallenge';

describe('MfaChallenge', () => {
  it('submits the trimmed code and shows why it was refused', async () => {
    const onSubmit = vi.fn(async () => Promise.resolve('Invalid code'));
    const user = userEvent.setup();
    const view = render(<MfaChallenge onSubmit={onSubmit} onStartOver={vi.fn()} />);
    await user.type(view.getByLabelText('Authenticator or recovery code'), ' 123456 ');
    await user.click(view.getByRole('button', { name: 'Verify' }));
    expect(onSubmit).toHaveBeenCalledWith('123456');
    expect(await view.findByRole('alert')).toHaveTextContent('Invalid code');
    const input = view.getByLabelText('Authenticator or recovery code');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(/6-digit code .* Invalid code/);
  });

  it('describes the code it wants', () => {
    const view = render(<MfaChallenge onSubmit={vi.fn()} onStartOver={vi.fn()} />);
    expect(view.getByLabelText('Authenticator or recovery code')).toHaveAccessibleDescription(
      'Enter the 6-digit code from your authenticator app, or one of your recovery codes.',
    );
  });

  it('shows nothing more once the code is accepted', async () => {
    const user = userEvent.setup();
    const view = render(<MfaChallenge onSubmit={async () => Promise.resolve(null)} onStartOver={vi.fn()} />);
    await user.type(view.getByLabelText('Authenticator or recovery code'), '123456');
    await user.click(view.getByRole('button', { name: 'Verify' }));
    expect(view.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('lets the user start over', async () => {
    const onStartOver = vi.fn();
    const user = userEvent.setup();
    const view = render(<MfaChallenge onSubmit={vi.fn()} onStartOver={onStartOver} />);
    await user.click(view.getByRole('button', { name: 'Start over' }));
    expect(onStartOver).toHaveBeenCalled();
  });
});
