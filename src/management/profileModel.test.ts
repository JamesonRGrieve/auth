// SPDX-License-Identifier: AGPL-3.0-or-later
import { afterEach, describe, expect, it, vi } from 'vitest';
import { detectTimezone, passwordChangeProblem, profileChanges, type UserProfile } from './profileModel';

const current: UserProfile = {
  id: 'u1',
  email: 'ada@example.com',
  first_name: 'Ada',
  last_name: 'Lovelace',
  display_name: null,
  timezone: 'Europe/London',
};

describe('profileChanges', () => {
  it('keeps only fields that changed, trimmed', () => {
    expect(
      profileChanges(current, {
        first_name: 'Ada',
        last_name: ' Byron ',
        display_name: 'Countess',
        timezone: 'Europe/London',
      }),
    ).toEqual({ last_name: 'Byron', display_name: 'Countess' });
  });

  it('turns a cleared field into null so the server unsets it', () => {
    expect(profileChanges(current, { first_name: '  ' })).toEqual({ first_name: null });
  });

  it('treats a blank submission of an unset field as no change', () => {
    expect(profileChanges(current, { display_name: '', username: '' })).toEqual({});
  });

  it('never sends fields outside the editable set', () => {
    expect(profileChanges(current, { email: 'eve@example.com', active: false, mfa_count: 0, id: 'u2' })).toEqual({});
  });
});

describe('detectTimezone', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the browser zone', () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
      ...new Intl.DateTimeFormat().resolvedOptions(),
      timeZone: 'America/Edmonton',
    });
    expect(detectTimezone()).toBe('America/Edmonton');
  });

  it('falls back to UTC when the runtime reports none', () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
      ...new Intl.DateTimeFormat().resolvedOptions(),
      timeZone: '',
    });
    expect(detectTimezone()).toBe('UTC');
  });
});

describe('passwordChangeProblem', () => {
  it.each([
    ['', 'new', 'new', 'Enter your current password.'],
    ['old', '', '', 'Enter a new password.'],
    ['old', 'new', 'nwe', 'The new passwords do not match.'],
    ['same', 'same', 'same', 'The new password must differ from the current one.'],
  ])('rejects current=%j next=%j again=%j', (currentPassword, next, again, problem) => {
    expect(passwordChangeProblem(currentPassword, next, again)).toBe(problem);
  });

  it('accepts a confirmed, different new password', () => {
    expect(passwordChangeProblem('old', 'new', 'new')).toBeNull();
  });
});
