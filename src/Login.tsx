'use client';
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Button } from '@jgrieve/forms/components/ui/button';
import { Input } from '@jgrieve/forms/components/ui/input';
import { Label } from '@jgrieve/forms/components/ui/label';
import { type ReactNode, type SyntheticEvent, useState } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import AuthCard from './AuthCard';
import type { AuthenticationConfig } from './Router';
import { signedInDestination } from './lib/afterSignIn';
import { useAssertion } from './lib/assert';
import { cookieText } from './lib/cookies';
import { validateURI } from './lib/validation';
import { MfaChallenge } from './mfa/MfaChallenge';
import { answerMfaChallenge, isMfaChallenge, passwordLogin, requestMagicLink } from './mfa/mfaApi';
import { useAuthentication } from './useAuthentication';

export type LoginProps = {
  userLoginEndpoint?: string;
};

const RESPONSE_MESSAGE_ID = 'login-response-message';

/** The address the identify step remembered, to sign in as. */
const rememberedEmail = (): string => cookieText('email');

const formText = (data: FormData, name: string): string => {
  const value = data.get(name);
  return typeof value === 'string' ? value : '';
};

const finishLogin = (authConfig: AuthenticationConfig): void => {
  window.location.href = signedInDestination(authConfig);
};

export default function Login({ userLoginEndpoint = '/v1/user/authorize' }: LoginProps): ReactNode {
  const [responseMessage, setResponseMessage] = useState('');
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const authConfig = useAuthentication();
  const [captcha, setCaptcha] = useState<string | null>(null);
  const needsCaptcha = typeof authConfig.recaptchaSiteKey === 'string' && authConfig.recaptchaSiteKey !== '';

  useAssertion(validateURI(authConfig.authServer + userLoginEndpoint), 'Invalid login endpoint.', [
    authConfig.authServer,
    userLoginEndpoint,
  ]);

  // Magic-link mode signs in by email alone: the link lands on the magic page.
  const byEmailLink = authConfig.authModes.magical && !authConfig.authModes.basic;
  const [linkSent, setLinkSent] = useState(false);
  // One attempt at a time: a double submit would spend a rate-limited login twice.
  const [pending, setPending] = useState(false);
  // Only a refused sign-in is the password's fault; a missing reCAPTCHA is not.
  const [passwordRejected, setPasswordRejected] = useState(false);

  const signIn = async (email: string, password: string): Promise<void> => {
    if (byEmailLink) {
      await requestMagicLink(authConfig.authServer, email);
      setLinkSent(true);
      return;
    }
    const answer = await passwordLogin(authConfig.authServer, email, password, userLoginEndpoint);
    if (isMfaChallenge(answer)) {
      setResponseMessage('');
      setChallengeToken(answer.challenge_token);
      return;
    }
    finishLogin(authConfig);
  };

  const submitPassword = async (event: SyntheticEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (needsCaptcha && (captcha === null || captcha === '')) {
      setResponseMessage('Please complete the reCAPTCHA.');
      return;
    }
    const formData = new FormData(event.currentTarget);
    setPending(true);
    setPasswordRejected(false);
    try {
      await signIn(formText(formData, 'email').toLowerCase().trim(), formText(formData, 'password'));
    } catch (error) {
      const fallback = byEmailLink ? 'The sign-in link could not be sent.' : 'Login failed.';
      setResponseMessage(error instanceof Error ? error.message : fallback);
      setPasswordRejected(!byEmailLink);
    } finally {
      setPending(false);
    }
  };

  const submitCode = async (code: string): Promise<string | null> => {
    if (challengeToken === null) {
      return 'Start over and sign in again.';
    }
    const problem = await answerMfaChallenge(authConfig.authServer, challengeToken, code);
    if (problem === null) {
      finishLogin(authConfig);
    }
    return problem;
  };

  if (challengeToken !== null) {
    return (
      <AuthCard title='Two-factor authentication' description='One more step to sign in.' showBackButton>
        <MfaChallenge
          onSubmit={submitCode}
          onStartOver={() => {
            setChallengeToken(null);
          }}
        />
      </AuthCard>
    );
  }

  if (linkSent) {
    return (
      <AuthCard title='Check your email' description='We sent you a sign-in link.' showBackButton>
        <p role='status' className='text-sm'>
          If {rememberedEmail()} has an account, a link to sign in is on its way. It works once and expires soon.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title='Login' description='Please login to your account.' showBackButton>
      <form
        aria-label='Login'
        onSubmit={(event) => {
          void submitPassword(event);
        }}
        className='flex flex-col gap-4'
      >
        <input type='hidden' id='email' name='email' value={rememberedEmail()} />
        {authConfig.authModes.basic && (
          <>
            <Label htmlFor='password'>Password</Label>
            <Input
              id='password'
              placeholder='Password'
              name='password'
              type='password'
              autoComplete='current-password'
              aria-invalid={passwordRejected}
              {...(responseMessage === '' ? {} : { 'aria-describedby': RESPONSE_MESSAGE_ID })}
            />
          </>
        )}
        {needsCaptcha && (
          <div className='my-3'>
            <ReCAPTCHA
              sitekey={authConfig.recaptchaSiteKey ?? ''}
              onChange={(token: string | null) => {
                setCaptcha(token);
              }}
            />
          </div>
        )}
        <Button type='submit' disabled={pending}>
          {byEmailLink ? 'Email me a sign-in link' : responseMessage !== '' ? 'Continue' : 'Login'}
        </Button>
        {responseMessage !== '' && (
          <AuthCard.ResponseMessage id={RESPONSE_MESSAGE_ID}>{responseMessage}</AuthCard.ResponseMessage>
        )}
      </form>
    </AuthCard>
  );
}
