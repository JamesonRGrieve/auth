'use client';
// SPDX-License-Identifier: AGPL-3.0-or-later

import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@jgrieve/forms/components/ui/button';
import { Input } from '@jgrieve/forms/components/ui/input';
import { Label } from '@jgrieve/forms/components/ui/label';
import { Separator } from '@jgrieve/forms/components/ui/separator';
import { setCookie } from 'cookies-next';
import { usePathname, useRouter } from 'next/navigation.js';
import type { ReactNode } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { LuUser } from 'react-icons/lu';
import { z } from 'zod';
import AuthCard from './AuthCard';
import { Alert } from './components/ui/alert';
import { AuthApiError, authSend } from './lib/api';
import { useAssertion } from './lib/assert';
import { validateURI } from './lib/validation';
import OAuth from './oauth2/OAuth';
import { useAuthentication } from './useAuthentication';
import { cookieDomainOptions } from './utils';

const schema = z.object({
  email: z.email({ message: 'Please enter a valid E-Mail address.' }),
  redirectTo: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const EMAIL_ERROR_ID = 'identify-email-error';
const HTTP_CONFLICT = 409;
const HTTP_UNPROCESSABLE = 422;

export type IdentifyProps = {
  identifyEndpoint?: string;
  redirectToOnExists?: string;
  redirectToOnNotExists?: string;
};

export default function Identify({
  identifyEndpoint = '/v1/user/exists',
  redirectToOnExists = '/login',
  redirectToOnNotExists = '/register', // TODO Default this to /register if in basic mode, and /login in magical mode
}: IdentifyProps): ReactNode {
  const router = useRouter();
  const authConfig = useAuthentication();
  const pathname = usePathname();

  useAssertion(validateURI(authConfig.authServer + identifyEndpoint), 'Invalid identify endpoint.', [
    authConfig.authServer,
    identifyEndpoint,
  ]);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  // Registering with the address alone answers whether it has an account: 409 means it does,
  // 422 (no credentials yet) or success means it doesn't.
  const onSubmit: SubmitHandler<FormData> = async (formData) => {
    const continueTo = (path: string): void => {
      void setCookie('email', formData.email, cookieDomainOptions());
      router.push(`${pathname}${path}`);
    };
    try {
      await authSend(`${authConfig.authServer}/v1/user`, {
        method: 'POST',
        body: { user: { email: formData.email.toLowerCase().trim() } },
      });
      continueTo(redirectToOnNotExists);
    } catch (exception: unknown) {
      if (exception instanceof AuthApiError && exception.status === HTTP_CONFLICT) {
        continueTo(redirectToOnExists);
      } else if (exception instanceof AuthApiError && exception.status === HTTP_UNPROCESSABLE) {
        continueTo(redirectToOnNotExists);
      } else {
        setError('email', {
          type: 'server',
          message: exception instanceof Error ? exception.message : 'Your address could not be checked.',
        });
      }
    }
  };

  const emailProblem = errors.email?.message ?? '';
  const showEmail = authConfig.authModes.basic || authConfig.authModes.magical;
  const showOAuth = authConfig.oauthProviders.length > 0;

  const description =
    showEmail && !showOAuth ? 'Please enter your email address to continue.' : 'Please choose an authentication method.';

  return (
    <AuthCard title='Welcome' description={description}>
      <form
        onSubmit={(e) => {
          void handleSubmit(onSubmit)(e);
        }}
        className='flex flex-col gap-4'
      >
        {showEmail && (
          <>
            <Label htmlFor='email'>E-Mail Address</Label>
            <Input
              id='email'
              autoComplete='username'
              placeholder='your@example.com'
              aria-invalid={emailProblem !== ''}
              {...(emailProblem === '' ? {} : { 'aria-describedby': EMAIL_ERROR_ID })}
              {...register('email')}
            />
            {emailProblem !== '' && (
              <Alert id={EMAIL_ERROR_ID} variant='destructive'>
                {emailProblem}
              </Alert>
            )}

            <Button variant='default' disabled={isSubmitting} className='w-full space-x-1'>
              <LuUser className='w-5 h-5' />
              <span>Continue with Email</span>
            </Button>
          </>
        )}

        {showEmail && showOAuth ? (
          <div className='flex items-center gap-2 my-2'>
            <Separator className='flex-1' />
            <span>or</span>
            <Separator className='flex-1' />
          </div>
        ) : null}

        {showOAuth && <OAuth />}
      </form>
    </AuthCard>
  );
}
