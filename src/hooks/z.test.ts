// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { AgentSchema, InvitationSchema, NotificationSchema, RoleSchema, TeamSchema, UserSchema, UserTeamSchema } from './z';

describe('RoleSchema', () => {
  it('accepts the known role literals', () => {
    for (const role of ['user', 'system', 'assistant', 'function']) {
      expect(RoleSchema.parse(role)).toBe(role);
    }
  });

  it('rejects unknown roles', () => {
    expect(RoleSchema.safeParse('admin').success).toBe(false);
  });
});

describe('AgentSchema', () => {
  it('requires a uuid id and a non-empty name', () => {
    const agent = { id: '11111111-1111-1111-1111-111111111111', name: 'Bot' };
    expect(AgentSchema.parse(agent)).toMatchObject(agent);
  });

  it('rejects a non-uuid id', () => {
    expect(AgentSchema.safeParse({ id: 'nope', name: 'Bot' }).success).toBe(false);
  });

  it('accepts server sentinel ids that are GUID-shaped but not RFC 9562 UUIDs', () => {
    const rootRole = { id: 'FFFFFFFF-FFFF-FFFF-AAAA-FFFFFFFFFFFF', name: 'Admin' };
    expect(AgentSchema.parse(rootRole)).toMatchObject(rootRole);
  });

  it('rejects an empty name', () => {
    expect(AgentSchema.safeParse({ id: '11111111-1111-1111-1111-111111111111', name: '' }).success).toBe(false);
  });
});

describe('UserSchema', () => {
  const base = {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'user@example.com',
    active: true,
    createdAt: '2024-01-01T00:00:00Z',
  };

  it('parses a minimal valid user', () => {
    expect(UserSchema.parse(base)).toMatchObject(base);
  });

  it('allows nullable optional name fields', () => {
    const parsed = UserSchema.parse({ ...base, firstName: null, lastName: 'Doe' });
    expect(parsed.firstName).toBeNull();
    expect(parsed.lastName).toBe('Doe');
  });

  it('rejects a malformed email', () => {
    expect(UserSchema.safeParse({ ...base, email: 'not-an-email' }).success).toBe(false);
  });

  it('rejects a missing active flag', () => {
    const { active: _omit, ...withoutActive } = base;
    expect(UserSchema.safeParse(withoutActive).success).toBe(false);
  });
});

describe('TeamSchema', () => {
  const base = {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Engineering',
    createdAt: '2024-01-01T00:00:00Z',
  };

  it('parses a minimal valid team', () => {
    expect(TeamSchema.parse(base)).toMatchObject(base);
  });

  it('accepts an optional nullable parentId', () => {
    expect(TeamSchema.parse({ ...base, parentId: null }).parentId).toBeNull();
  });

  it('rejects an empty name', () => {
    expect(TeamSchema.safeParse({ ...base, name: '' }).success).toBe(false);
  });
});

describe('UserTeamSchema', () => {
  it('parses an object carrying an id', () => {
    expect(UserTeamSchema.parse({ id: 'ut-1' })).toMatchObject({ id: 'ut-1' });
  });
});

describe('NotificationSchema', () => {
  it('requires the full notification payload', () => {
    const notification = {
      conversationId: 'c1',
      conversationName: 'Chat',
      message: 'hi',
      messageId: 'm1',
      createdAt: '2024-01-01T00:00:00Z',
      role: 'user',
    };
    expect(NotificationSchema.parse(notification)).toEqual(notification);
  });

  it('rejects a payload missing the message id', () => {
    expect(
      NotificationSchema.safeParse({
        conversationId: 'c1',
        conversationName: 'Chat',
        message: 'hi',
        createdAt: '2024-01-01T00:00:00Z',
        role: 'user',
      }).success,
    ).toBe(false);
  });
});

describe('InvitationSchema', () => {
  const base = {
    id: '55555555-5555-5555-5555-555555555555',
    teamId: '66666666-6666-6666-6666-666666666666',
    code: null,
    roleId: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: null,
    createdByUserId: null,
    user: null,
    userId: null,
  };

  it('parses a valid invitation with a null nested user', () => {
    expect(InvitationSchema.parse(base)).toMatchObject({ id: base.id, teamId: base.teamId });
  });

  it('keeps the nested user null when none is attached', () => {
    expect(InvitationSchema.parse(base).user).toBeNull();
  });

  it('rejects a non-uuid teamId', () => {
    expect(InvitationSchema.safeParse({ ...base, teamId: 'team' }).success).toBe(false);
  });

  it('rejects a missing required teamId', () => {
    const { teamId: _omit, ...withoutTeam } = base;
    expect(InvitationSchema.safeParse(withoutTeam).success).toBe(false);
  });
});
