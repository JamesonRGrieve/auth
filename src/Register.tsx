'use client';
// SPDX-License-Identifier: AGPL-3.0-or-later
import { toTitleCase } from '@jgrieve/forms/DynamicForm';
import { Button } from '@jgrieve/forms/components/ui/button';
import { Input } from '@jgrieve/forms/components/ui/input';
import { Label } from '@jgrieve/forms/components/ui/label';
import axios, { type AxiosError, type AxiosResponse } from 'axios';
import { type CookieValueTypes, deleteCookie, getCookie } from 'cookies-next';
import { useRouter } from 'next/navigation.js';
import { type ChangeEvent, type ReactNode, type SyntheticEvent, useEffect, useRef, useState } from 'react';
import { ReCAPTCHA } from 'react-google-recaptcha';
import AuthCard from './AuthCard';
import { useAssertion } from './lib/assert';
import { validateURI } from './lib/validation';
import { loginRedirectPath, type RegisterResponseFlags } from './registerRedirect';
import { useAuthentication } from './useAuthentication';
import { cookieDomainOptions } from './utils';

export type RegisterProps = {
  additionalFields?: string[];
  userRegisterEndpoint?: string;
};

export default function Register({ additionalFields = [], userRegisterEndpoint = '/v1/user' }: RegisterProps): ReactNode {
  const formRef = useRef<HTMLFormElement | null>(null);
  const router = useRouter();
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');
  const [passwords, setPasswords] = useState({ password: '', passwordAgain: '' });
  const [passwordsMatch, setPasswordsMatch] = useState(false);

  const authConfig = useAuthentication();
  useAssertion(validateURI(authConfig.authServer + userRegisterEndpoint), 'Invalid login endpoint.', [
    authConfig.authServer,
    userRegisterEndpoint,
  ]);
  const submitForm = async (event: SyntheticEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (authConfig.recaptchaSiteKey !== undefined && authConfig.recaptchaSiteKey !== '' && captcha === null) {
      setResponseMessage('Please complete the reCAPTCHA.');
      return;
    }
    const formData = Object.fromEntries(new FormData(event.currentTarget));
    const invitationCookie = getCookie('invitation');
    if (typeof invitationCookie === 'string' && invitationCookie !== '') {
      formData['invitation_code'] = invitationCookie;
    }
    type RegisterPayload = RegisterResponseFlags & { detail?: string };
    let registerResponse: AxiosResponse<RegisterPayload> | null | undefined;
    let registerResponseData: RegisterPayload | undefined;
    try {
      registerResponse = await axios
        .post<RegisterPayload>(`${authConfig.authServer}${userRegisterEndpoint}`, {
          user: {
            ...formData,
          },
        })
        .catch((exception: AxiosError<RegisterPayload>) => {
          console.error(exception);
          return exception.response;
        });
      if (registerResponse !== undefined && (registerResponse.status === 200 || registerResponse.status === 201)) {
        void deleteCookie('invitation', cookieDomainOptions());
        void deleteCookie('team', cookieDomainOptions());
      }
      registerResponseData = registerResponse?.data;
    } catch (exception: unknown) {
      console.error(exception);
      registerResponse = null;
    }

    // TODO Check for status 418 which is app disabled by admin.
    setResponseMessage(registerResponseData?.detail ?? '');
    if (registerResponse !== null && registerResponse !== undefined && [200, 201].includes(registerResponse.status)) {
      router.push(loginRedirectPath(registerResponseData));
    }
  };
  useEffect(() => {
    // To-Do Assert that there are no dupes or empty strings in additionalFields (after trimming and lowercasing)
  }, []);
  useEffect(() => {
    if (!submitted && formRef.current !== null && authConfig.authModes.magical && additionalFields.length === 0) {
      setSubmitted(true);
      formRef.current.requestSubmit();
    }
  }, [submitted, authConfig.authModes.magical, additionalFields.length]);

  const [invite, _setInvite] = useState<CookieValueTypes | Promise<CookieValueTypes> | undefined>(getCookie('invitation'));
  const teamNameCookie = getCookie('team');
  const teamName = typeof teamNameCookie === 'string' ? teamNameCookie : '';

  const registerHeader = {
    title: 'Sign Up',
    description: 'Welcome! Please complete your registration.',
  };

  const inviteHeader = {
    title: 'Accept Invitation',
    description:
      typeof invite === 'string' && invite !== ''
        ? `You've been invited to join ${teamName}. Please complete your registration to join the team.`
        : `You've been invited to join a team. Please complete your registration to join the team.`,
  };
  const hasInvite = typeof invite === 'string' && invite !== '';

  return (
    <div className={additionalFields.length === 0 && authConfig.authModes.magical ? ' invisible' : ''}>
      <AuthCard
        title={hasInvite ? inviteHeader.title : registerHeader.title}
        description={hasInvite ? inviteHeader.description : registerHeader.description}
        showBackButton
      >
        <form
          onSubmit={(e) => {
            void submitForm(e);
          }}
          className='flex flex-col gap-4'
          ref={formRef}
        >
          <input
            type='hidden'
            id='email'
            name='email'
            value={((getCookie('email') as string | undefined) ?? '').toLowerCase().trim()}
          />
          {authConfig.authModes.basic && (
            <>
              <Label htmlFor='password'>Password</Label>
              <Input
                id='password'
                placeholder='Password'
                name='password'
                type='password'
                required
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setPasswords((prev) => ({ ...prev, password: e.target.value }));
                  setPasswordsMatch(e.target.value === passwords.passwordAgain);
                }}
              />
              <Label htmlFor='password-again'>Password (Again)</Label>
              <Input
                id='password-again'
                placeholder='Password'
                name='password-again'
                type='password'
                required
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setPasswords((prev) => ({ ...prev, passwordAgain: e.target.value }));
                  setPasswordsMatch(e.target.value === passwords.password);
                }}
              />
            </>
          )}
          {additionalFields.length > 0 &&
            additionalFields.map((field) => (
              <div key={field} className='space-y-1'>
                <Label htmlFor={field}>{toTitleCase(field)}</Label>
                <Input key={field} id={field} name={field} type='text' required placeholder={toTitleCase(field)} />
              </div>
            ))}
          {authConfig.recaptchaSiteKey !== undefined && authConfig.recaptchaSiteKey !== '' && (
            <div
              style={{
                margin: '0.8rem 0',
              }}
            >
              <ReCAPTCHA
                sitekey={authConfig.recaptchaSiteKey}
                onChange={(token: string | null) => {
                  setCaptcha(token);
                }}
              />
            </div>
          )}
          <Button type='submit' disabled={authConfig.authModes.basic && !passwordsMatch}>
            {hasInvite ? 'Accept Invitation' : 'Register'}
          </Button>
          {responseMessage !== '' && <AuthCard.ResponseMessage>{responseMessage}</AuthCard.ResponseMessage>}
        </form>
        {/* {invite && <OAuth />} */}
      </AuthCard>
    </div>
  );
}
