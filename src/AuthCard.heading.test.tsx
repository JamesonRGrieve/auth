// SPDX-License-Identifier: AGPL-3.0-or-later
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AuthCard from './AuthCard';

describe('AuthCard (heading)', () => {
  it('is the page: its title is the one h1, and nothing above it skips a level', () => {
    const view = render(
      <AuthCard title='Welcome' description='Sign in to carry on.'>
        <p>The form</p>
      </AuthCard>,
    );
    expect(view.getAllByRole('heading')).toHaveLength(1);
    expect(view.getByRole('heading', { level: 1, name: 'Welcome' })).toBeInTheDocument();
  });
});
