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

  it('refuses paths a browser would resolve to another host', () => {
    for (const target of ['/\\evil.example', '/\\/evil.example', '/\t/evil.example', '/\n/evil.example']) {
      expect(safeRedirectPath(target)).toBe('/');
    }
  });

  it('keeps a same-site path in its normalised form', () => {
    expect(safeRedirectPath('/team/../chat?x=1#top')).toBe('/chat?x=1#top');
  });

  it('falls back to the given path', () => {
    expect(safeRedirectPath('', '/user')).toBe('/user');
    expect(safeRedirectPath('/chat', '/user')).toBe('/chat');
  });
});
