'use client';
// SPDX-License-Identifier: AGPL-3.0-or-later
import { toTitleCase } from '@jgrieve/forms/DynamicForm';
import { Button } from '@jgrieve/forms/components/ui/button';
import { Input } from '@jgrieve/forms/components/ui/input';
import { Label } from '@jgrieve/forms/components/ui/label';
import { deleteCookie } from 'cookies-next';
import { useRouter } from 'next/navigation.js';
import { type ChangeEvent, type ReactNode, type SyntheticEvent, useEffect, useRef, useState } from 'react';
import { ReCAPTCHA } from 'react-google-recaptcha';
import AuthCard from './AuthCard';
import { authRequest } from './lib/api';
import { useAssertion } from './lib/assert';
import { cookieText } from './lib/cookies';
import { validateURI } from './lib/validation';
import { loginRedirectPath, RegisterResponseSchema } from './registerRedirect';
import { useAuthentication } from './useAuthentication';
import { cookieDomainOptions } from './utils';

export type RegisterProps = {
  additionalFields?: string[];
  userRegisterEndpoint?: string;
};

const PASSWORD_MATCH_ID = 'register-password-match';

export default function Register({ additionalFields = [], userRegisterEndpoint = '/v1/user' }: RegisterProps): ReactNode {
  const formRef = useRef<HTMLFormElement | null>(null);
  const router = useRouter();
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');
  const [passwords, setPasswords] = useState({ password: '', passwordAgain: '' });
  const [passwordsMatch, setPasswordsMatch] = useState(false);
  const [pending, setPending] = useState(false);
  const mismatch = passwords.passwordAgain !== '' && !passwordsMatch;
  /** Set by the auth middleware from an invite link. */
  const invite = cookieText('invitation');

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
    // The repeated password only guards the form; the server keeps unknown fields as metadata.
    const fields = Object.fromEntries(
      [...new FormData(event.currentTarget)].filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string' && entry[0] !== 'password-again',
      ),
    );
    const invitation = invite === '' ? {} : { invitation_code: invite };
    setPending(true);
    try {
      const flags = await authRequest(`${authConfig.authServer}${userRegisterEndpoint}`, RegisterResponseSchema, {
        method: 'POST',
        body: { user: { ...fields, ...invitation } },
      });
      void deleteCookie('invitation', cookieDomainOptions());
      void deleteCookie('team', cookieDomainOptions());
      setResponseMessage('');
      router.push(loginRedirectPath(`${authConfig.authPath}${authConfig.login.path}`, flags));
    } catch (exception: unknown) {
      setResponseMessage(exception instanceof Error ? exception.message : 'Registration failed.');
      setPending(false);
    }
  };
  useEffect(() => {
    if (!submitted && formRef.current !== null && authConfig.authModes.magical && additionalFields.length === 0) {
      setSubmitted(true);
      formRef.current.requestSubmit();
    }
  }, [submitted, authConfig.authModes.magical, additionalFields.length]);

  const teamName = cookieText('team');

  const registerHeader = {
    title: 'Sign Up',
    description: 'Welcome! Please complete your registration.',
  };

  const inviteHeader = {
    title: 'Accept Invitation',
    description:
      teamName !== ''
        ? `You've been invited to join ${teamName}. Please complete your registration to join the team.`
        : `You've been invited to join a team. Please complete your registration to join the team.`,
  };
  const hasInvite = invite !== '';

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
          <input type='hidden' id='email' name='email' value={cookieText('email').toLowerCase().trim()} />
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
                aria-invalid={mismatch}
                aria-describedby={PASSWORD_MATCH_ID}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setPasswords((prev) => ({ ...prev, passwordAgain: e.target.value }));
                  setPasswordsMatch(e.target.value === passwords.password);
                }}
              />
              <p id={PASSWORD_MATCH_ID} className={mismatch ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}>
                {mismatch ? 'The passwords do not match.' : 'Type the same password again.'}
              </p>
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
          <Button type='submit' disabled={pending || (authConfig.authModes.basic && !passwordsMatch)}>
            {hasInvite ? 'Accept Invitation' : 'Register'}
          </Button>
          {responseMessage !== '' && <AuthCard.ResponseMessage>{responseMessage}</AuthCard.ResponseMessage>}
        </form>
      </AuthCard>
    </div>
  );
}
