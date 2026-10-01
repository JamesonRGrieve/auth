// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { TeamSchema, UserSchema } from './z';

describe('UserSchema', () => {
  const base = { id: '22222222-2222-2222-2222-222222222222', email: 'user@example.com' };

  it('parses a user with only the fields it cannot do without', () => {
    expect(UserSchema.parse(base)).toEqual(base);
  });

  it('accepts null for every field the server may leave empty', () => {
    const nulls = {
      username: null,
      displayName: null,
      firstName: null,
      lastName: null,
      active: null,
      createdAt: null,
      imageUrl: null,
    };
    expect(UserSchema.parse({ ...base, ...nulls })).toEqual({ ...base, ...nulls });
  });

  it('accepts server sentinel ids that are GUID-shaped but not RFC 9562 UUIDs', () => {
    expect(UserSchema.parse({ ...base, id: 'FFFFFFFF-FFFF-FFFF-AAAA-FFFFFFFFFFFF' }).id).toBe(
      'FFFFFFFF-FFFF-FFFF-AAAA-FFFFFFFFFFFF',
    );
  });

  it('rejects a user without a usable id or email', () => {
    expect(UserSchema.safeParse({ ...base, id: null }).success).toBe(false);
    expect(UserSchema.safeParse({ ...base, email: 'not-an-email' }).success).toBe(false);
  });
});

describe('TeamSchema', () => {
  const base = { id: '33333333-3333-3333-3333-333333333333', name: 'Engineering' };

  it('parses a team with only an id and a name', () => {
    expect(TeamSchema.parse(base)).toEqual(base);
  });

  it('accepts null for every field the server may leave empty', () => {
    const nulls = { description: null, createdAt: null, updatedAt: null, parentId: null };
    expect(TeamSchema.parse({ ...base, ...nulls })).toEqual({ ...base, ...nulls });
  });

  it('rejects a team without a name', () => {
    expect(TeamSchema.safeParse({ ...base, name: '' }).success).toBe(false);
    expect(TeamSchema.safeParse({ ...base, name: null }).success).toBe(false);
  });
});
