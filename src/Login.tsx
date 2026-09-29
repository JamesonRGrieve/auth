'use client';
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Button } from '@jgrieve/forms/components/ui/button';
import { Input } from '@jgrieve/forms/components/ui/input';
import { Label } from '@jgrieve/forms/components/ui/label';
import { deleteCookie, getCookie } from 'cookies-next';
import { type ReactNode, type SyntheticEvent, useState } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import AuthCard from './AuthCard';
import { AuthApiError } from './lib/api';
import { useAssertion } from './lib/assert';
import { validateURI } from './lib/validation';
import { MfaChallenge } from './mfa/MfaChallenge';
import { completeMfaLogin, isMfaChallenge, passwordLogin } from './mfa/mfaApi';
import { useAuthentication } from './useAuthentication';
import { cookieDomainOptions } from './utils';

export type LoginProps = {
  userLoginEndpoint?: string;
};

const UNAUTHORIZED = 401;

const cookieText = (name: string): string => {
  const value = getCookie(name);
  return typeof value === 'string' ? value : '';
};

const formText = (data: FormData, name: string): string => {
  const value = data.get(name);
  return typeof value === 'string' ? value : '';
};

/** Keep the session and continue where the user was headed (a pending invitation first). */
function finishLogin(token: string): void {
  // biome-ignore lint/suspicious/noDocumentCookie: CookieStore API not widely available; document.cookie is required for legacy compatibility
  document.cookie = `jwt=${token}; path=/`;
  const invitation = cookieText('invitation');
  const appUri = process.env.NEXT_PUBLIC_APP_URI ?? '';
  if (invitation !== '') {
    void deleteCookie('invitation', cookieDomainOptions());
    window.location.href = `${appUri}/invite/${invitation}`;
    return;
  }
  const destination = cookieText('href');
  const fallback = appUri === '' ? `${window.location.protocol}//${window.location.hostname}/user` : `${appUri}/user`;
  window.location.href = destination === '' ? fallback : destination;
}

const refusal = (error: Error | null, fallback: string): string => error?.message ?? fallback;

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

  const submitPassword = async (event: SyntheticEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (needsCaptcha && (captcha === null || captcha === '')) {
      setResponseMessage('Please complete the reCAPTCHA.');
      return;
    }
    const formData = new FormData(event.currentTarget);
    const email = formText(formData, 'email').toLowerCase().trim();
    try {
      const answer = await passwordLogin(authConfig.authServer, email, formText(formData, 'password'), userLoginEndpoint);
      if (isMfaChallenge(answer)) {
        setResponseMessage('');
        setChallengeToken(answer.challenge_token);
        return;
      }
      finishLogin(answer.token);
    } catch (error) {
      setResponseMessage(refusal(error instanceof Error ? error : null, 'Login failed.'));
    }
  };

  const submitCode = async (code: string): Promise<string | null> => {
    if (challengeToken === null) {
      return 'Start over and sign in again.';
    }
    try {
      finishLogin((await completeMfaLogin(authConfig.authServer, challengeToken, code)).token);
      return null;
    } catch (error) {
      if (error instanceof AuthApiError && error.status === UNAUTHORIZED) {
        return `${error.detail}. Try the current code, or start over if it keeps failing.`;
      }
      return refusal(error instanceof Error ? error : null, 'The code could not be checked.');
    }
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

  return (
    <AuthCard title='Login' description='Please login to your account.' showBackButton>
      <form
        aria-label='Login'
        onSubmit={(event) => {
          void submitPassword(event);
        }}
        className='flex flex-col gap-4'
      >
        <input type='hidden' id='email' name='email' value={cookieText('email')} />
        {authConfig.authModes.basic && (
          <>
            <Label htmlFor='password'>Password</Label>
            <Input id='password' placeholder='Password' name='password' type='password' autoComplete='current-password' />
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
        <Button type='submit'>{responseMessage !== '' ? 'Continue' : 'Login'}</Button>
        {responseMessage !== '' && <AuthCard.ResponseMessage>{responseMessage}</AuthCard.ResponseMessage>}
      </form>
    </AuthCard>
  );
}
