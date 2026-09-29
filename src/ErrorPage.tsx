'use client';
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Button } from '@jgrieve/forms/components/ui/button';
import { useRouter } from 'next/navigation.js';
import type { ReactNode } from 'react';

export type ErrorPageProps = {
  redirectTo?: string;
};

export default function ErrorPage({ redirectTo: _redirectTo = '/' }: ErrorPageProps): ReactNode {
  const router = useRouter();

  const logout = (): void => {
    router.push('/user/logout');
  };

  return (
    <div className='flex min-h-[100svh] w-full flex-col items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8'>
      <div className='max-w-md mx-auto text-center'>
        <h1 className='mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl'>Oops, something went wrong!</h1>
        <p className='mt-4 text-muted-foreground'>
          We&apos;re sorry, but an unexpected error has occurred. Please try again later or contact support if the issue
          persists.
        </p>
        <div className='flex justify-center gap-4 mt-6'>
          <Button onClick={() => router.back()}>Try again</Button>
          <Button onClick={logout}>Logout</Button>
        </div>
      </div>
    </div>
  );
}
