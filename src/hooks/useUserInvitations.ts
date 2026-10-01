// SPDX-License-Identifier: AGPL-3.0-or-later
import { setCookie } from 'cookies-next/client';
import { useCallback } from 'react';
import useSWR, { type SWRResponse } from 'swr';
import { authRequest, authSend } from '../lib/api';
import { ACTIVE_TEAM_COOKIE } from '../lib/cookies';
import {
  type InvitationAnswer,
  invitationAnswer,
  type PendingInvitation,
  PendingInvitationsResponseSchema,
} from '../management/invitationsModel';
import { cookieDomainOptions } from '../utils';

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
      await authSend(`${authServer}/v1/invitation/${encodeURIComponent(invitation.id)}`, {
        method: 'PATCH',
        body: invitationAnswer(invitation, action),
      });
      // Joining a team puts the user in it, as choosing it in the team switcher would.
      const teamId = invitation.team_id ?? '';
      if (action === 'accept' && teamId !== '') {
        setCookie(ACTIVE_TEAM_COOKIE, teamId, cookieDomainOptions());
      }
      await mutate();
    },
    [authServer, mutate],
  );

  return { invitations, answer };
}
