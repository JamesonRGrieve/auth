'use client';
import { useAssertion } from '@/components/jrg/assert/assert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toTitleCase } from '@/dynamic-form/DynamicForm';
import { validateURI } from '@/lib/validation';
import axios, { AxiosError } from 'axios';
import { getCookie } from 'cookies-next';
import { useRouter } from 'next/navigation';
import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { ReCAPTCHA } from 'react-google-recaptcha';
import AuthCard from './AuthCard';
import OAuth from './oauth2/OAuth';
import { useAuthentication } from './Router';

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
    if (authConfig.authModes.basic) {
      if (!formData['password']) {
        setResponseMessage('Please enter a password.');
      }
      if (!formData['password-again']) {
        setResponseMessage('Please enter your password again.');
      }
      if (formData['password'] !== formData['password-again']) {
        setResponseMessage('Passwords do not match.');
      }
    }
    if (getCookie('invitation')) {
      formData['invitation_id'] = getCookie('invitation') ?? ''.toString();
    }
    let registerResponse;
    let registerResponseData;
    try {
      registerResponse = await axios
        .post(`${authConfig.authServer}${userRegisterEndpoint}`, {
          ...formData,
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
    if (getCookie('invitation')) {
      setInvite(getCookie('team_id') || '');
    }
  }, []);
  useEffect(() => {
    if (!submitted && formRef.current && authConfig.authModes.magical && additionalFields.length === 0) {
      setSubmitted(true);
      formRef.current.requestSubmit();
    }
  }, []);
  const [invite, setInvite] = useState<string | null>(null);
  return (
    <div className={additionalFields.length === 0 && authConfig.authModes.magical ? ' invisible' : ''}>
      <AuthCard
        title={invite !== null ? 'Accept Invitation to ' + (invite.replaceAll('+', ' ') || 'Team') : 'Sign Up'}
        description={`Welcome, please complete your registration. ${invite !== null ? 'You are ' : ''}${invite ? ' to ' + invite.replaceAll('+', ' ') + '.' : ''}${invite !== null ? '.' : ''}`}
        showBackButton
      >
        <form onSubmit={submitForm} className='flex flex-col gap-4' ref={formRef}>
          {/* {authConfig.register.heading && <Typography variant='h2'>{authConfig.register.heading}</Typography>} */}

          <input type='hidden' id='email' name='email' value={getCookie('email')} />
          {authConfig.authModes.basic && (
            <>
              <Label htmlFor='password'>Password</Label>
              <Input id='password' placeholder='Password' name='password' autoComplete='password' />
              <Label htmlFor='password-again'>Password (Again)</Label>
              <Input id='password-again' placeholder='Password' name='password' autoComplete='password' />
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
          <Button type='submit'>Register</Button>
          {responseMessage && <AuthCard.ResponseMessage>{responseMessage}</AuthCard.ResponseMessage>}
        </form>
        {invite && <OAuth />}
      </AuthCard>
    </div>
  );
}
