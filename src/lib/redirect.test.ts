// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { safeRedirectPath } from './redirect';

describe('safeRedirectPath', () => {
  it('keeps same-origin paths', () => {
    expect(safeRedirectPath('/')).toBe('/');
    expect(safeRedirectPath('/team/1?tab=users')).toBe('/team/1?tab=users');
  });

  it('refuses anything that could leave the site', () => {
    for (const target of ['https://evil.example', '//evil.example', 'data:text/html,hi', 'team', '']) {
      expect(safeRedirectPath(target)).toBe('/');
    }
  });

  it('falls back to the given path', () => {
    expect(safeRedirectPath('', '/user')).toBe('/user');
    expect(safeRedirectPath('/chat', '/user')).toBe('/chat');
  });
});
