// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { invitationAnswer, type PendingInvitation } from './invitationsModel';

const base: PendingInvitation = { id: 'inv-1', created_at: '2026-09-20T00:00:00Z' };

describe('invitationAnswer', () => {
  it('answers with the caller’s own invitee row when there is one', () => {
    expect(invitationAnswer({ ...base, code: 'CODE', invitees: [{ id: 'row-1', status: 'pending' }] }, 'accept')).toEqual({
      invitation: { invitee_id: 'row-1', action: 'accept' },
    });
  });

  it('falls back to the invitation code', () => {
    expect(invitationAnswer({ ...base, code: 'CODE' }, 'decline')).toEqual({
      invitation: { invitation_code: 'CODE', action: 'decline' },
    });
  });

  it('cannot answer an invitation with neither', () => {
    expect(invitationAnswer({ ...base, code: null, invitees: [] }, 'accept')).toBeNull();
  });
});
