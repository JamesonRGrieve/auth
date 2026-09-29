'use client';
// SPDX-License-Identifier: AGPL-3.0-or-later
import { Button } from '@jgrieve/forms/components/ui/button';
import Link from 'next/link.js';
import { useRouter } from 'next/navigation.js';
import { type ReactNode, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { useProfile } from '../hooks/useProfile';
import { useTeams } from '../hooks/useTeam';
import log from '../lib/log';
import { useAuthentication } from '../useAuthentication';
import { Account } from './Account';
import { InvitationsTable } from './Invitations';
import { Profile } from './Profile';
import { detectTimezone } from './profileModel';

export type ManageProps = {
  /** Where "Go to <app>" leads. */
  returnPath?: string;
};

function Teams(): ReactNode {
  const { data: teams = [] } = useTeams();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Teams</CardTitle>
        <CardDescription>The teams you belong to.</CardDescription>
      </CardHeader>
      <CardContent>
        {teams.length === 0 ? (
          <p className='text-sm text-muted-foreground'>You are not a member of any team yet.</p>
        ) : (
          <ul className='divide-y rounded-md border'>
            {teams.map((team) => (
              <li key={team.id}>
                <Link href={`/team/${team.id}`} className='block px-4 py-3 text-sm font-medium hover:bg-muted'>
                  {team.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/** The signed-in user's account page: profile, password, teams and pending invitations. */
export default function Manage({ returnPath = '/' }: ManageProps): ReactNode {
  const router = useRouter();
  const authConfig = useAuthentication();
  const { profile, error, isLoading, update, changePassword } = useProfile(authConfig.authServer);

  // A new account has no timezone; record the browser's once so times render locally.
  const timezoneRecorded = useRef(false);
  useEffect(() => {
    if (profile === undefined || (profile.timezone ?? '') !== '' || timezoneRecorded.current) {
      return;
    }
    timezoneRecorded.current = true;
    void (async (): Promise<void> => {
      try {
        await update({ timezone: detectTimezone() });
      } catch (failure) {
        log(['Recording the browser timezone failed', failure], { client: 1 });
      }
    })();
  }, [profile, update]);

  return (
    <main className='mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-10'>
      <div className='flex items-center justify-between gap-2'>
        {authConfig.manage.heading !== undefined && authConfig.manage.heading !== '' && (
          <h2 className='text-3xl font-semibold'>{authConfig.manage.heading}</h2>
        )}
        <Button
          onClick={() => {
            router.push(returnPath);
          }}
        >
          Go to {authConfig.appName}
        </Button>
      </div>
      {isLoading ? (
        <p className='text-sm text-muted-foreground'>Loading your account…</p>
      ) : error !== undefined || profile === undefined ? (
        <p role='alert' className='text-sm text-destructive'>
          Your account could not be loaded{error === undefined ? '.' : `: ${error.message}`}
        </p>
      ) : (
        <>
          <Profile profile={profile} onSave={update} />
          {authConfig.authModes.basic && <Account onChangePassword={changePassword} />}
          <Teams />
          <InvitationsTable userId={profile.id} />
        </>
      )}
    </main>
  );
}
