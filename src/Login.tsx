'use client';
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Button } from '@jgrieve/forms/components/ui/button';
import { Input } from '@jgrieve/forms/components/ui/input';
import { Label } from '@jgrieve/forms/components/ui/label';
import axios, { type AxiosError } from 'axios';
import { deleteCookie, getCookie } from 'cookies-next';
import { useRouter } from 'next/navigation';
import { type ReactNode, type SyntheticEvent, useState } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { LuCheck as Check, LuCopy as Copy } from 'react-icons/lu';
import QRCode from 'react-qr-code';
import AuthCard from './AuthCard';
import { useAssertion } from './lib/assert';
import { validateURI } from './lib/validation';
import { AuthenticatorHelp as MissingAuthenticator } from './mfa/MissingAuthenticator';
import { useAuthentication } from './useAuthentication';
import { cookieDomainOptions } from './utils';

export type LoginProps = {
  userLoginEndpoint?: string;
};
export const CopyButton = ({ content, label = 'Copy' }: { content: string; label?: string }): React.JSX.Element => {
  const [isCopied, setIsCopied] = useState(false);

  return (
    <Button
      variant='outline'
      size='sm'
      type='button'
      className='flex items-center gap-2 mx-auto'
      onClick={() => {
        setIsCopied(true);
        void navigator.clipboard.writeText(content);
        setTimeout(() => setIsCopied(false), 2000);
      }}
    >
      {isCopied ? <Check className='w-4 h-4' /> : <Copy className='w-4 h-4' />}
      {isCopied ? 'Copied!' : label}
    </Button>
  );
};

export default function Login({
  searchParams,
  userLoginEndpoint = '/v1/user/authorize',
}: { searchParams: Record<string, string | string[] | undefined> } & LoginProps): ReactNode {
  const [responseMessage, setResponseMessage] = useState('');
  const authConfig = useAuthentication();
  const _router = useRouter();
  const [captcha, setCaptcha] = useState<string | null>(null);

  useAssertion(validateURI(authConfig.authServer + userLoginEndpoint), 'Invalid login endpoint.', [
    authConfig.authServer,
    userLoginEndpoint,
  ]);
  const submitForm = async (event: SyntheticEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (
      authConfig.recaptchaSiteKey !== undefined &&
      authConfig.recaptchaSiteKey !== '' &&
      (captcha === null || captcha === '')
    ) {
      setResponseMessage('Please complete the reCAPTCHA.');
      return;
    }

    const formData = new FormData(event.currentTarget);
    const email = (formData.get('email') as string).toLowerCase().trim();
    const password = formData.get('password') as string;

    try {
      const authString = `${email}:${password}`;
      const encodedAuth = `Basic ${Buffer.from(authString, 'utf-8').toString('base64')}`;

      const response = await axios
        .post<{ detail?: string; token?: string }>(`${authConfig.authServer}${userLoginEndpoint}`, null, {
          headers: {
            Authorization: encodedAuth,
          },
        })
        .catch((exception: AxiosError) => exception.response);

      if (response !== undefined) {
        const responseData = response.data as { detail?: string; token?: string };
        if (response.status !== 200) {
          setResponseMessage(responseData.detail ?? '');
        } else {
          const token = responseData.token;
          if (token !== undefined && token !== '') {
            // Store the token and redirect
            // biome-ignore lint/suspicious/noDocumentCookie: CookieStore API not widely available; document.cookie is required for legacy compatibility
            document.cookie = `jwt=${token}; path=/`;
            //If detail property used in future
            // if (validateURI(response.data.detail)) {
            //   window.location.href = response.data.detail;
            // } else {
            //   setResponseMessage(response.data.detail);
            // }
            const invitation = getCookie('invitation');
            if (typeof invitation === 'string' && invitation !== '') {
              void deleteCookie('invitation', cookieDomainOptions());
              window.location.href = `${process.env.NEXT_PUBLIC_APP_URI ?? ''}/invite/${invitation}`;
              return;
            }
            const hrefCookie = await getCookie('href');
            const appUri = process.env.NEXT_PUBLIC_APP_URI;
            const href2 =
              appUri !== undefined && appUri !== ''
                ? `${appUri}/user`
                : `${window.location.protocol}//${window.location.hostname}/user`;
            window.location.href = typeof hrefCookie === 'string' && hrefCookie !== '' ? hrefCookie : href2;
          } else {
            setResponseMessage('Login failed: No token received');
          }
        }
      }
    } catch (exception: unknown) {
      console.error(exception);
    }
  };
  const otpUri = searchParams['otp_uri'];
  return (
    <AuthCard title='Login' description='Please login to your account.' showBackButton>
      <form
        onSubmit={(e) => {
          void submitForm(e);
        }}
        className='flex flex-col gap-4'
      >
        {typeof otpUri === 'string' && otpUri !== '' && (
          <div className='flex flex-col max-w-xs gap-2 mx-auto text-center'>
            <div
              style={{
                padding: '0.5rem',
                backgroundColor: 'white',
              }}
            >
              <QRCode
                size={256}
                style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                value={otpUri}
                viewBox={`0 0 256 256`}
              />
            </div>
            <p className='text-sm text-center text-muted-foreground'>
              Scan the above QR code with Microsoft Authenticator, Google Authenticator or equivalent (or click the copy
              button if you are using your Authenticator device).
            </p>
            <CopyButton content={otpUri} label={'Copy Link'} />
          </div>
        )}
        <input type='hidden' id='email' name='email' value={(getCookie('email') as string | undefined) ?? ''} />
        {authConfig.authModes.basic && (
          <>
            <Label htmlFor='password'>Password</Label>
            <Input id='password' placeholder='Password' name='password' type='password' autoComplete='password' />
          </>
        )}
        {typeof otpUri === 'string' && otpUri !== '' && (
          <>
            <Label htmlFor='token'>Multi-Factor Code</Label>
            <Input id='token' placeholder='Enter your 6 digit code' name='token' autoComplete='one-time-code' />
            <MissingAuthenticator />
          </>
        )}
        {typeof authConfig.recaptchaSiteKey === 'string' && authConfig.recaptchaSiteKey !== '' && (
          <div className='my-3'>
            <ReCAPTCHA
              sitekey={authConfig.recaptchaSiteKey}
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
