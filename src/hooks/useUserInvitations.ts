// SPDX-License-Identifier: AGPL-3.0-or-later
import { useCallback } from 'react';
import useSWR, { type SWRResponse } from 'swr';
import { authRequest, authSend } from '../lib/api';
import {
  type InvitationAnswer,
  invitationAnswer,
  type PendingInvitation,
  PendingInvitationsResponseSchema,
} from '../management/invitationsModel';

export const USER_INVITATIONS_ENDPOINT = '/v1/user/invitation';

export interface UserInvitations {
  invitations: SWRResponse<PendingInvitation[], Error>;
  /** Accept or decline; resolves once the server has recorded the answer. */
  answer: (invitation: PendingInvitation, action: InvitationAnswer) => Promise<void>;
}

/** Invitations awaiting the signed-in user's answer on `authServer`, and answering them. */
export function useUserInvitations(authServer: string): UserInvitations {
  const url = `${authServer}${USER_INVITATIONS_ENDPOINT}`;
  const invitations = useSWR<PendingInvitation[], Error>(url, async () =>
    authRequest(url, PendingInvitationsResponseSchema).then((response) => response.invitations),
  );
  const { mutate } = invitations;

  const answer = useCallback(
    async (invitation: PendingInvitation, action: InvitationAnswer): Promise<void> => {
      const body = invitationAnswer(invitation, action);
      if (body === null) {
        throw new Error('This invitation can’t be answered here.');
      }
      await authSend(`${authServer}/v1/invitation/${encodeURIComponent(invitation.id)}`, { method: 'PATCH', body });
      await mutate();
    },
    [authServer, mutate],
  );

  return { invitations, answer };
}
