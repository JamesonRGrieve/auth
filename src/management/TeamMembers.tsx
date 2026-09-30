'use client';
// SPDX-License-Identifier: AGPL-3.0-or-later
import { Button } from '@jgrieve/forms/components/ui/button';
import { Label } from '@jgrieve/forms/components/ui/label';
import { type ReactElement, useId, useState } from 'react';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { useTeam } from '../hooks/useTeam';
import { type InvitationWithInvitees, useTeamAccess, useTeamActions, useTeamInvitations } from '../hooks/useTeamManagement';
import { useUser } from '../hooks/useUser';
import { InviteForm } from './InviteForm';
import { inviteeStatus, inviteLink, type Membership, memberName, type Role, roleLabel } from './teamModel';

function MemberRow({
  member,
  isSelf,
  assignable,
  onChangeRole,
}: {
  member: Membership;
  isSelf: boolean;
  /** Roles the viewer may give this member; empty when they can't change it. */
  assignable: Role[];
  onChangeRole: (member: Membership, roleId: string) => Promise<string | null>;
}): ReactElement {
  const selectId = useId();
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const name = memberName(member);
  const canChange = !isSelf && assignable.some((option) => option.id === member.role_id);

  return (
    <li className='flex flex-wrap items-center justify-between gap-2 p-4'>
      <div>
        <p className='font-medium'>
          {name}
          {isSelf && <span className='font-normal text-muted-foreground'> (you)</span>}
        </p>
        {(member.user.email ?? '') !== name && <p className='text-sm text-muted-foreground'>{member.user.email}</p>}
      </div>
      {canChange ? (
        <div className='flex items-center gap-2'>
          <Label htmlFor={selectId} className='sr-only'>
            Role for {name}
          </Label>
          <select
            id={selectId}
            className='rounded-md border bg-background px-2 py-1 text-sm'
            value={member.role_id}
            disabled={pending}
            onChange={(event) => {
              const roleId = event.target.value;
              setPending(true);
              void (async (): Promise<void> => {
                setProblem(await onChangeRole(member, roleId));
                setPending(false);
              })();
            }}
          >
            {assignable.map((option) => (
              <option key={option.id} value={option.id}>
                {roleLabel(option)}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <Badge variant='outline'>{roleLabel(member.role)}</Badge>
      )}
      {problem !== null && (
        <p role='alert' className='w-full text-sm text-destructive'>
          {problem}
        </p>
      )}
    </li>
  );
}

function InvitationRow({
  entry: { invitation, invitees },
  role,
  onRevoke,
}: {
  entry: InvitationWithInvitees;
  role: Role | undefined;
  onRevoke: (invitationId: string) => Promise<string | null>;
}): ReactElement {
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ text: string; alert: boolean } | null>(null);
  const code = invitation.code ?? '';
  const sent = new Date(invitation.created_at).toLocaleDateString();

  const copyLink = (email: string): void => {
    void (async (): Promise<void> => {
      try {
        await navigator.clipboard.writeText(inviteLink(window.location.origin, code, email));
        setNotice({ text: `Copied the invite link for ${email}.`, alert: false });
      } catch (error) {
        setNotice({ text: error instanceof Error ? error.message : 'The link could not be copied.', alert: true });
      }
    })();
  };

  return (
    <li className='grid gap-2 p-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <p className='text-sm'>
          <span className='font-medium'>{roleLabel(role)}</span>
          <span className='text-muted-foreground'> · sent {sent}</span>
        </p>
        <Button
          size='sm'
          variant='outline'
          disabled={pending}
          aria-label={`Revoke the invitation sent ${sent}`}
          onClick={() => {
            setPending(true);
            void (async (): Promise<void> => {
              const problem = await onRevoke(invitation.id);
              if (problem !== null) {
                setNotice({ text: problem, alert: true });
                setPending(false);
              }
            })();
          }}
        >
          Revoke
        </Button>
      </div>
      <ul className='grid gap-1'>
        {invitees.map((invitee) => {
          const status = inviteeStatus(invitee);
          return (
            <li key={invitee.id} className='flex flex-wrap items-center gap-2 text-sm'>
              <span>{invitee.email}</span>
              <Badge variant={status === 'accepted' ? 'default' : 'secondary'}>{status}</Badge>
              {status === 'pending' && code !== '' && (
                <Button size='sm' variant='ghost' onClick={() => copyLink(invitee.email)}>
                  Copy link<span className='sr-only'> for {invitee.email}</span>
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      {notice !== null && (
        <p role={notice.alert ? 'alert' : 'status'} className={notice.alert ? 'text-sm text-destructive' : 'text-sm'}>
          {notice.text}
        </p>
      )}
    </li>
  );
}

function TeamInvitations({
  teamId,
  roles,
  assignable,
}: {
  teamId: string;
  roles: Role[];
  /** Roles the viewer may invite with. */
  assignable: Role[];
}): ReactElement {
  const invitations = useTeamInvitations(teamId);
  const { revokeInvitation } = useTeamActions();
  const rolesById = new Map(roles.map((role) => [role.id, role]));
  const open = (invitations.data ?? []).filter(({ invitees }) =>
    invitees.some((invitee) => inviteeStatus(invitee) === 'pending'),
  );

  const onRevoke = async (invitationId: string): Promise<string | null> => {
    try {
      await revokeInvitation(invitationId);
      await invitations.mutate();
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'The invitation could not be revoked.';
    }
  };

  return (
    <>
      <InviteForm
        teamId={teamId}
        roles={assignable}
        onInvited={async () => {
          await invitations.mutate();
        }}
      />
      <Card>
        <CardHeader>
          <CardTitle>Pending invitations</CardTitle>
          <CardDescription>Invitations into this team that are still waiting for an answer.</CardDescription>
        </CardHeader>
        <CardContent>
          {invitations.error !== undefined && (
            <p role='alert' className='text-sm text-destructive'>
              The invitations could not be loaded: {invitations.error.message}
            </p>
          )}
          {invitations.error === undefined && open.length === 0 && (
            <p className='text-sm text-muted-foreground'>{invitations.isLoading ? 'Loading…' : 'No pending invitations.'}</p>
          )}
          {open.length > 0 && (
            <ul aria-label='Pending team invitations' className='divide-y rounded-md border'>
              {open.map((entry) => (
                <InvitationRow
                  key={entry.invitation.id}
                  entry={entry}
                  role={rolesById.get(entry.invitation.role_id ?? '')}
                  onRevoke={onRevoke}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}

export type TeamMembersProps = {
  /** The team to show; the active team when omitted. */
  teamId?: string;
};

/**
 * A team's members, and for its admins the role controls, pending invitations and the invite form.
 * What an admin may grant is capped at their own role, as the server enforces.
 */
export function TeamMembers({ teamId }: TeamMembersProps): ReactElement {
  const { data: activeTeam } = useTeam(teamId);
  const resolvedTeamId = teamId ?? activeTeam?.id;
  const { data: user } = useUser();
  const { members, roles, admin, assignable } = useTeamAccess(resolvedTeamId);
  const { changeRole } = useTeamActions();

  if (resolvedTeamId === undefined || resolvedTeamId === '') {
    return <p className='text-sm text-muted-foreground'>Choose or create a team to manage its members.</p>;
  }

  const onChangeRole = async (member: Membership, roleId: string): Promise<string | null> => {
    try {
      await changeRole(resolvedTeamId, member.user_id, roleId);
      await members.mutate();
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'The role could not be changed.';
    }
  };

  return (
    <div className='grid gap-6'>
      <Card>
        <CardHeader>
          <CardTitle>Members{activeTeam?.name === undefined ? '' : ` of ${activeTeam.name}`}</CardTitle>
          <CardDescription>
            {admin ? 'Everyone on this team. You can change the role of members up to your own.' : 'Everyone on this team.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.error !== undefined && (
            <p role='alert' className='text-sm text-destructive'>
              The members could not be loaded: {members.error.message}
            </p>
          )}
          {members.error === undefined && (members.data ?? []).length === 0 && (
            <p className='text-sm text-muted-foreground'>{members.isLoading ? 'Loading…' : 'This team has no members.'}</p>
          )}
          {(members.data ?? []).length > 0 && (
            <ul aria-label='Team members' className='divide-y rounded-md border'>
              {(members.data ?? []).map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  isSelf={member.user_id === user?.id}
                  assignable={assignable}
                  onChangeRole={onChangeRole}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      {admin && <TeamInvitations teamId={resolvedTeamId} roles={roles} assignable={assignable} />}
    </div>
  );
}
