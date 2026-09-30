'use client';
// SPDX-License-Identifier: AGPL-3.0-or-later

import { type ReactNode, useEffect, useRef, useState } from 'react';
import AuthCard from './AuthCard';
import { signedInDestination } from './lib/afterSignIn';
import { MfaChallenge } from './mfa/MfaChallenge';
import { answerMfaChallenge, isMfaChallenge, verifyMagicLink } from './mfa/mfaApi';
import { useAuthentication } from './useAuthentication';

export type MagicLinkProps = Record<string, never>;

type Step = { kind: 'checking' } | { kind: 'challenge'; challengeToken: string } | { kind: 'failed'; problem: string };

/**
 * Where a sign-in link lands (`<authPath>/magic?token=…`; the server's MAGIC_LINK_BASE_URL). The
 * token is redeemed once: the user is signed in, or asked for their second factor first.
 */
export default function MagicLink(): ReactNode {
  const authConfig = useAuthentication();
  const [step, setStep] = useState<Step>({ kind: 'checking' });
  // A link is single-use; strict-mode's second effect run must not spend it again.
  const redeemed = useRef(false);

  useEffect(() => {
    if (redeemed.current) {
      return;
    }
    redeemed.current = true;
    const token = new URLSearchParams(window.location.search).get('token') ?? '';
    if (token.length === 0) {
      setStep({ kind: 'failed', problem: 'This sign-in link is incomplete.' });
      return;
    }
    void (async (): Promise<void> => {
      try {
        const answer = await verifyMagicLink(authConfig.authServer, token);
        if (isMfaChallenge(answer)) {
          setStep({ kind: 'challenge', challengeToken: answer.challenge_token });
          return;
        }
        window.location.replace(signedInDestination(authConfig));
      } catch (error) {
        setStep({ kind: 'failed', problem: error instanceof Error ? error.message : 'This sign-in link did not work.' });
      }
    })();
  }, [authConfig]);

  if (step.kind === 'challenge') {
    return (
      <AuthCard title='Two-factor authentication' description='One more step to sign in.'>
        <MfaChallenge
          onSubmit={async (code) => {
            const problem = await answerMfaChallenge(authConfig.authServer, step.challengeToken, code);
            if (problem === null) {
              window.location.replace(signedInDestination(authConfig));
            }
            return problem;
          }}
          onStartOver={() => {
            window.location.replace(authConfig.authPath);
          }}
        />
      </AuthCard>
    );
  }
  if (step.kind === 'failed') {
    return (
      <AuthCard title='Sign-in link' description='Request a new link from the sign-in page.' showBackButton>
        <p role='alert' className='text-sm text-destructive'>
          {step.problem}
        </p>
      </AuthCard>
    );
  }
  return (
    <AuthCard title='Signing you in' description='Checking your sign-in link…'>
      <p className='text-sm text-muted-foreground'>One moment.</p>
    </AuthCard>
  );
}
