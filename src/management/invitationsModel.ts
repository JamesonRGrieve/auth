// SPDX-License-Identifier: AGPL-3.0-or-later
import { z } from 'zod';

const NamedSchema = z.object({ id: z.string().optional(), name: z.string() });

/** One invitation awaiting the signed-in user's answer (GET /v1/user/invitation). */
export const PendingInvitationSchema = z.object({
  id: z.string(),
  team_id: z.string().nullable().optional(),
  code: z.string().nullable().optional(),
  expires_at: z.string().nullable().optional(),
  created_at: z.string(),
  team: NamedSchema.nullable().optional(),
  role: NamedSchema.nullable().optional(),
  /** The caller's own pending rows, for invitations sent to an email or shared by code. */
  invitees: z.array(z.object({ id: z.string(), status: z.string() })).optional(),
});
export type PendingInvitation = z.infer<typeof PendingInvitationSchema>;

export const PendingInvitationsResponseSchema = z.object({ invitations: z.array(PendingInvitationSchema) });

export type InvitationAnswer = 'accept' | 'decline';

type AnswerBody = { invitation: { invitee_id?: string; invitation_code?: string; action: InvitationAnswer } };

/**
 * The PATCH /v1/invitation/{id} body that answers `invitation` as the caller: their own
 * invitee row when they have one, else the invitation's code. `null` when neither exists.
 */
export function invitationAnswer(invitation: PendingInvitation, action: InvitationAnswer): AnswerBody | null {
  const invitee = invitation.invitees?.find((row) => row.status === 'pending');
  if (invitee !== undefined) {
    return { invitation: { invitee_id: invitee.id, action } };
  }
  if (invitation.code !== undefined && invitation.code !== null && invitation.code !== '') {
    return { invitation: { invitation_code: invitation.code, action } };
  }
  return null;
}
