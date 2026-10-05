'use client';
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ReactElement } from 'react';
import { useAuthentication } from '../useAuthentication';
import { answerWithSecurityKey, ceremonyProblem, passkeysSupported } from '../webauthn/webauthnApi';
import { MfaChallenge } from './MfaChallenge';
import { answerMfaChallenge, type MfaChallenge as Challenge } from './mfaApi';

/** How a challenge names a security key among the account's second factors. */
const SECURITY_KEY_METHOD = 'webauthn';

/**
 * A sign-in's second step, whichever sign-in raised `challenge`: a code, or one of the account's
 * security keys when it has one and the browser can use it. `onSignedIn` runs once the server has
 * set the session cookies.
 */
export function SecondFactor({
  challenge,
  onSignedIn,
  onStartOver,
}: {
  challenge: Challenge;
  onSignedIn: () => void;
  onStartOver: () => void;
}): ReactElement {
  const { authServer } = useAuthentication();
  const settled = (problem: string | null): string | null => {
    if (problem === null) {
      onSignedIn();
    }
    return problem;
  };
  const withSecurityKey = async (): Promise<string | null> => {
    try {
      await answerWithSecurityKey(authServer, challenge.challenge_token);
      return settled(null);
    } catch (error) {
      return error instanceof Error ? ceremonyProblem(error) : 'The security key could not be used.';
    }
  };
  const hasSecurityKey =
    challenge.methods.some(({ method_type: type }) => type === SECURITY_KEY_METHOD) && passkeysSupported();

  return (
    <MfaChallenge
      onSubmit={async (code) => settled(await answerMfaChallenge(authServer, challenge.challenge_token, code))}
      onStartOver={onStartOver}
      {...(hasSecurityKey ? { onSecurityKey: withSecurityKey } : {})}
    />
  );
}
