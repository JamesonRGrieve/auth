// SPDX-License-Identifier: AGPL-3.0-or-later
import { render, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { AuthServerProvider, useAuthServer } from './AuthServerContext';

const withBase =
  (baseUrl: string) =>
  ({ children }: { children: ReactNode }): ReactNode => (
    <AuthServerProvider baseUrl={baseUrl}>{children}</AuthServerProvider>
  );

describe('AuthServerProvider', () => {
  it('gives every call the app’s API base without a trailing slash', () => {
    expect(renderHook(() => useAuthServer(), { wrapper: withBase('https://app.example.com/api/') }).result.current).toBe(
      'https://app.example.com/api',
    );
    expect(renderHook(() => useAuthServer(), { wrapper: withBase('/api') }).result.current).toBe('/api');
    expect(renderHook(() => useAuthServer(), { wrapper: withBase('') }).result.current).toBe('');
  });

  it('renders its children', () => {
    const view = render(
      <AuthServerProvider baseUrl='/api'>
        <p>inside</p>
      </AuthServerProvider>,
    );
    expect(view.getByText('inside')).toBeInTheDocument();
  });

  it('refuses to be used without a provider', () => {
    expect(() => renderHook(() => useAuthServer())).toThrow('useAuthServer must be used within an AuthServerProvider');
  });
});
