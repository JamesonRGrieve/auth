// SPDX-License-Identifier: AGPL-3.0-or-later
import { deleteCookie, getCookie, setCookie } from 'cookies-next/client';
import { afterEach, describe, expect, it } from 'vitest';
import { signedInDestination } from './afterSignIn';

const CONFIG = { authPath: '/user', manage: { path: '/manage' } };

describe('signedInDestination', () => {
  afterEach(() => {
    deleteCookie('invitation');
    deleteCookie('href');
  });

  it('sends a user with a pending invitation to the account page, once', () => {
    setCookie('invitation', 'inv-1');
    setCookie('href', '/chat');
    expect(signedInDestination(CONFIG)).toBe('/user/manage');
    expect(getCookie('invitation')).toBeUndefined();
    expect(signedInDestination(CONFIG)).toBe('/chat');
  });

  it('returns to the interrupted page on this site, else the auth pages', () => {
    expect(signedInDestination(CONFIG)).toBe('/user');
    setCookie('href', '/team/1?tab=users');
    expect(signedInDestination(CONFIG)).toBe('/team/1?tab=users');
    setCookie('href', 'https://evil.example/');
    expect(signedInDestination(CONFIG)).toBe('/user');
  });
});
