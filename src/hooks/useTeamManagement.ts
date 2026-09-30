// SPDX-License-Identifier: AGPL-3.0-or-later
import useSWR, { type SWRResponse } from 'swr';
import { z } from 'zod';
import { useAuthServer } from '../AuthServerContext';
import { authList, authRequest, authSend } from '../lib/api';
import {
  invitableRoles,
  type Invitee,
  InviteeSchema,
  isTeamAdmin,
  type Membership,
  MembershipsResponseSchema,
  type Role,
  RoleSchema,
  type TeamInvitation,
  TeamInvitationSchema,
} from '../management/teamModel';
import { useUser } from './useUser';

export interface InvitationWithInvitees {
  invitation: TeamInvitation;
  invitees: Invitee[];
}

const segment = encodeURIComponent;

/** The team's memberships, each with its user and role. */
export function useTeamMembers(teamId: string | undefined): SWRResponse<Membership[], Error> {
  const authServer = useAuthServer();
  return useSWR<Membership[], Error>(
    teamId === undefined || teamId === '' ? null : [authServer, 'team-members', teamId],
    async () =>
      authRequest(`${authServer}/v1/team/${segment(teamId ?? '')}/user`, MembershipsResponseSchema).then(
        (response) => response.user_teams,
      ),
  );
}

const InvitationWithInviteesSchema = TeamInvitationSchema.extend({ invitees: z.array(InviteeSchema).default([]) });

/** Every invitation into the team (all pages), each with who it went to. */
export function useTeamInvitations(teamId: string | undefined): SWRResponse<InvitationWithInvitees[], Error> {
  const authServer = useAuthServer();
  return useSWR<InvitationWithInvitees[], Error>(
    teamId === undefined || teamId === '' ? null : [authServer, 'team-invitations', teamId],
    async () =>
      authList(
        `${authServer}/v1/team/${segment(teamId ?? '')}/invitation?include=invitees`,
        'invitations',
        InvitationWithInviteesSchema,
      ).then((rows) => rows.map(({ invitees, ...invitation }) => ({ invitation, invitees }))),
  );
}

/** Every role the signed-in user can see: the system roles and their teams' own. */
export function useRoles(): SWRResponse<Role[], Error> {
  const authServer = useAuthServer();
  return useSWR<Role[], Error>([authServer, 'roles'], async () => authList(`${authServer}/v1/role`, 'roles', RoleSchema));
}

export interface TeamAccess {
  members: SWRResponse<Membership[], Error>;
  roles: Role[];
  /** The viewer's own role on the team, once their membership has loaded. */
  ownRoleId: string | undefined;
  /** Whether the viewer is an admin (or higher) of the team. */
  admin: boolean;
  /** The roles the viewer may grant on the team; empty unless they are an admin. */
  assignable: Role[];
}

/** What the signed-in user may do on `teamId`, from their membership and the role hierarchy. */
export function useTeamAccess(teamId: string | undefined): TeamAccess {
  const { data: user } = useUser();
  const members = useTeamMembers(teamId);
  const { data: roles = [] } = useRoles();
  const ownRoleId = (members.data ?? []).find((member) => member.user_id === user?.id)?.role_id;
  const admin = isTeamAdmin(roles, ownRoleId);
  return {
    members,
    roles,
    ownRoleId,
    admin,
    assignable: admin && teamId !== undefined ? invitableRoles(roles, ownRoleId, teamId) : [],
  };
}

const CreatedTeamSchema = z.object({ team: z.object({ id: z.string() }) });

export interface TeamActions {
  /** Create a team; resolves to its id. */
  createTeam: (name: string, parentId?: string) => Promise<string>;
  renameTeam: (teamId: string, name: string) => Promise<void>;
  /** Invite `emails` into the team with `roleId`; the server emails each address its link. */
  invite: (teamId: string, roleId: string, emails: string[]) => Promise<void>;
  revokeInvitation: (invitationId: string) => Promise<void>;
  changeRole: (teamId: string, userId: string, roleId: string) => Promise<void>;
  /** Remove a member; given your own id, leave the team. The team's last admin cannot go (409). */
  removeMember: (teamId: string, userId: string) => Promise<void>;
}

/** The team management writes, on the app's API server. Callers revalidate what they show. */
export function useTeamActions(): TeamActions {
  const authServer = useAuthServer();
  return {
    createTeam: async (name, parentId) =>
      authRequest(`${authServer}/v1/team`, CreatedTeamSchema, {
        method: 'POST',
        body: { team: { name, ...(parentId === undefined ? {} : { parent_id: parentId }) } },
      }).then((response) => response.team.id),
    renameTeam: async (teamId, name) =>
      authSend(`${authServer}/v1/team/${segment(teamId)}`, { method: 'PUT', body: { team: { name } } }),
    invite: async (teamId, roleId, emails) =>
      authSend(`${authServer}/v1/team/${segment(teamId)}/invitation`, {
        method: 'POST',
        body: { invitation: { role_id: roleId, email: emails } },
      }),
    revokeInvitation: async (invitationId) =>
      authSend(`${authServer}/v1/invitation/${segment(invitationId)}`, { method: 'DELETE' }),
    changeRole: async (teamId, userId, roleId) =>
      authSend(`${authServer}/v1/team/${segment(teamId)}/user/${segment(userId)}`, {
        method: 'PATCH',
        body: { user_team: { role_id: roleId } },
      }),
    removeMember: async (teamId, userId) =>
      authSend(`${authServer}/v1/team/${segment(teamId)}/user/${segment(userId)}`, { method: 'DELETE' }),
  };
}
