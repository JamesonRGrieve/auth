'use client';
import { useAssertion } from '@/components/assert/assert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toTitleCase } from '@/dynamic-form/DynamicForm';
import { validateURI } from '@/lib/validation';
import axios, { AxiosError } from 'axios';
import { getCookie, setCookie } from 'cookies-next';
import { useRouter } from 'next/navigation';
import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { ReCAPTCHA } from 'react-google-recaptcha';
import AuthCard from './AuthCard';
import OAuth from './oauth2/OAuth';
import { useAuthentication } from './Router';
import { useTeam } from './hooks/useTeam';
import useSWR from 'swr';

export type RegisterProps = {
  additionalFields?: string[];
  userRegisterEndpoint?: string;
};

export default function Register({ additionalFields = [], userRegisterEndpoint = '/v1/user' }: RegisterProps): ReactNode {
  const formRef = useRef(null);
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
  const submitForm = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (authConfig.recaptchaSiteKey && !captcha) {
      setResponseMessage('Please complete the reCAPTCHA.');
      return;
    }
    const formData = Object.fromEntries(new FormData((event.currentTarget as HTMLFormElement) ?? undefined));
    if (getCookie('invitation')) {
      formData['invitation_id'] = String(getCookie('invitation') || '');
    }
    let registerResponse;
    let registerResponseData;
    try {
      registerResponse = await axios
        .post(`${authConfig.authServer}${userRegisterEndpoint}`, {
          user: {
            ...formData,
          },
        })
        .catch((exception: AxiosError) => {
          console.error(exception);
          return exception.response;
        });
      registerResponseData = registerResponse?.data;
    } catch (exception) {
      console.error(exception);
      registerResponse = null;
    }

    // TODO Check for status 418 which is app disabled by admin.
    setResponseMessage(registerResponseData?.detail);
    const loginParams = [];
    if (registerResponseData?.otp_uri) {
      loginParams.push(`otp_uri=${registerResponseData?.otp_uri}`);
    }
    if (registerResponseData?.verify_email) {
      loginParams.push(`verify_email=true`);
    }
    if (registerResponseData?.verify_sms) {
      loginParams.push(`verify_sms=true`);
    }
    if ([200, 201].includes(registerResponse?.status || 500)) {
      router.push(loginParams.length > 0 ? `/user/login?${loginParams.join('&')}` : '/user/login');
    } else {
    }
  };
  useEffect(() => {
    // To-Do Assert that there are no dupes or empty strings in additionalFields (after trimming and lowercasing)
  }, [additionalFields]);
  useEffect(() => {
    if (!submitted && formRef.current && authConfig.authModes.magical && additionalFields.length === 0) {
      setSubmitted(true);
      formRef.current.requestSubmit();
    }
  }, []);

  const [invite, setInvite] = useState<string | null>(null);

  useEffect(() => {
    const invitation = String(getCookie('invitation') || '');
    if (invitation) {
      fetch(`${process.env.NEXT_PUBLIC_API_URI}/v1/invitation/${invitation}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.teamId) {
            setCookie('auth-team', String(data.teamId), { domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN });
            setInvite(data.team && data.team.name ? String(data.team.name) : null);
          }
        });
    }
  }, []);

  const registerHeader = {
    title: 'Sign Up',
    description: 'Welcome! Please complete your registration.',
  };

  const inviteHeader = {
    title: 'Accept Invitation',
    description: invite
      ? `You've been invited to join ${invite}. Please complete your registration to join the team.`
      : `You've been invited to join a team. Please complete your registration to join the team.`,
  };

  return (
    <div className={additionalFields.length === 0 && authConfig.authModes.magical ? ' invisible' : ''}>
      <AuthCard
        title={invite !== null ? inviteHeader.title : registerHeader.title}
        description={invite !== null ? inviteHeader.description : registerHeader.description}
        showBackButton
      >
        <form onSubmit={submitForm} className='flex flex-col gap-4' ref={formRef}>
          <input type='hidden' id='email' name='email' value={String(getCookie('email') || '')} />
          {authConfig.authModes.basic && (
            <>
              <Label htmlFor='password'>Password</Label>
              <Input
                id='password'
                placeholder='Password'
                name='password'
                type='password'
                autoFocus={authConfig.authModes.basic}
                required
                onChange={(e) => {
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
                onChange={(e) => {
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
                <Input
                  key={field}
                  id={field}
                  name={field}
                  type='text'
                  autoFocus={field === 'first_name'}
                  required
                  placeholder={toTitleCase(field)}
                />
              </div>
            ))}
          {authConfig.recaptchaSiteKey && (
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
            {invite !== null ? 'Accept Invitation' : 'Register'}
          </Button>
          {responseMessage && <AuthCard.ResponseMessage>{responseMessage}</AuthCard.ResponseMessage>}
        </form>
        {invite && <OAuth />}
      </AuthCard>
    </div>
  );
}
