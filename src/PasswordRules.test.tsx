// SPDX-License-Identifier: AGPL-3.0-or-later
import { render, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PasswordRules } from './PasswordRules';

const policy = { min_length: 8, max_bytes: 72, require_letter: true, require_digit: true };

const states = (password: string, refused?: Parameters<typeof PasswordRules>[0]['refused']): string[] => {
  const view = render(<PasswordRules id='rules' policy={policy} password={password} refused={refused} />);
  return within(view.getByRole('list', { name: 'Password requirements' }))
    .getAllByRole('listitem')
    .map((item) => item.textContent);
};

describe('PasswordRules', () => {
  it('lists every rule as unmet before anything is typed', () => {
    expect(states('')).toEqual([
      'At least 8 characters: not met yet',
      'No more than 72 bytes (accented letters and emoji take more than one): not met yet',
      'At least one letter: not met yet',
      'At least one digit: not met yet',
    ]);
  });

  it('follows what is typed', () => {
    expect(states('abcdefgh')).toEqual([
      'At least 8 characters: met',
      'No more than 72 bytes (accented letters and emoji take more than one): met',
      'At least one letter: met',
      'At least one digit: not met yet',
    ]);
  });

  it('marks a rule the server refused as unmet', () => {
    expect(states('abcdefg1', ['require_digit'])[3]).toBe('At least one digit: not met yet');
  });

  it('leaves out a requirement the policy switches off', () => {
    const view = render(<PasswordRules id='rules' policy={{ ...policy, require_letter: false }} password='' />);
    expect(view.queryByText(/At least one letter/)).not.toBeInTheDocument();
  });
});
