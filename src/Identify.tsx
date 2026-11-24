'use client';
// SPDX-License-Identifier: AGPL-3.0-or-later

import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@jgrieve/forms/components/ui/button';
import { Input } from '@jgrieve/forms/components/ui/input';
import { Label } from '@jgrieve/forms/components/ui/label';
import { Separator } from '@jgrieve/forms/components/ui/separator';
import { setCookie } from 'cookies-next';
import Link from 'next/link.js';
import { usePathname, useRouter } from 'next/navigation.js';
import type { ReactNode } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { LuUser } from 'react-icons/lu';
import { z } from 'zod';
import AuthCard from './AuthCard';
import { Alert } from './components/ui/alert';
import { signedInDestination } from './lib/afterSignIn';
import { AuthApiError, authSend } from './lib/api';
import OAuth from './oauth2/OAuth';
import { oauth2ProviderDisplay } from './oauth2/OAuthProviders';
import { useAuthentication } from './useAuthentication';
import { cookieDomainOptions } from './utils';
import { PasskeySignIn } from './webauthn/PasskeySignIn';

const schema = z.object({
  email: z.email({ message: 'Enter a valid email address.' }),
  redirectTo: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const EMAIL_ERROR_ID = 'identify-email-error';
const HTTP_FORBIDDEN = 403;
const HTTP_CONFLICT = 409;
const HTTP_UNPROCESSABLE = 422;
export const NO_ACCOUNT = 'There’s no account with that address.';

/** The welcome page's line: what the visitor can do here, with or without making an account. */
function welcomeLine(showEmail: boolean, showOAuth: boolean, onlyAccount: string | null, signupOpen: boolean): string {
  if (!signupOpen) {
    return showEmail && !showOAuth
      ? 'Enter your email to sign in.'
      : showEmail
        ? 'Sign in with your email or another account.'
        : onlyAccount === null
          ? 'Sign in.'
          : `Sign in with your ${onlyAccount} account.`;
  }
  return showEmail && !showOAuth
    ? 'Enter your email to sign in or create an account.'
    : showEmail
      ? 'Sign in or create an account, with your email or another account.'
      : onlyAccount === null
        ? 'Sign in or create an account.'
        : `Sign in with your ${onlyAccount} account. First time here? That sets you up.`;
}

export type IdentifyProps = {
  redirectToOnExists?: string;
  /** A new address registers; in magic-link mode the register step sends the link by itself. */
  redirectToOnNotExists?: string;
};

export default function Identify({
  redirectToOnExists = '/login',
  redirectToOnNotExists = '/register',
}: IdentifyProps): ReactNode {
  const router = useRouter();
  const authConfig = useAuthentication();
  const pathname = usePathname();
  const signupOpen = authConfig.signupOpen !== false;

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
    // With sign-up closed a new address has nowhere to go, so it's told so here.
    const newAddress = (): void => {
      if (signupOpen) {
        continueTo(redirectToOnNotExists);
      } else {
        setError('email', { type: 'server', message: NO_ACCOUNT });
      }
    };
    try {
      await authSend(`${authConfig.authServer}/v1/user`, {
        method: 'POST',
        body: { user: { email: formData.email.toLowerCase().trim() } },
      });
      newAddress();
    } catch (exception: unknown) {
      if (exception instanceof AuthApiError && exception.status === HTTP_CONFLICT) {
        continueTo(redirectToOnExists);
      } else if (
        exception instanceof AuthApiError &&
        (exception.status === HTTP_UNPROCESSABLE || (!signupOpen && exception.status === HTTP_FORBIDDEN))
      ) {
        newAddress();
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

  // One provider and no email: name the account it signs in with.
  const onlyProvider = authConfig.oauthProviders.at(0);
  const onlyAccount =
    showEmail || authConfig.oauthProviders.length !== 1 || onlyProvider === undefined
      ? null
      : (new Map(Object.entries(authConfig.oauthLabels ?? {})).get(onlyProvider) ??
        oauth2ProviderDisplay(onlyProvider).label);
  const description = welcomeLine(showEmail, showOAuth, onlyAccount, signupOpen);

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
            <Label htmlFor='email'>Email</Label>
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

            <Button variant='default' disabled={isSubmitting} className='w-full'>
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

        {showOAuth && <OAuth primary={!showEmail} />}

        {authConfig.authModes.passkey && (
          <PasskeySignIn
            email={null}
            onSignedIn={() => {
              window.location.href = signedInDestination(authConfig);
            }}
          />
        )}

        {!signupOpen && authConfig.waitlistPath !== undefined && authConfig.waitlistPath !== '' && (
          <p className='text-sm text-center text-muted-foreground'>
            No account yet?{' '}
            <Link href={authConfig.waitlistPath} className='font-medium text-primary underline-offset-4 hover:underline'>
              Join the waitlist
            </Link>
          </p>
        )}

        {authConfig.signInAlternatives.map(({ label, path }) => (
          <Link key={path} href={`${authConfig.authPath}${path}`} className='text-sm text-center underline'>
            {label}
          </Link>
        ))}
      </form>
    </AuthCard>
  );
}
