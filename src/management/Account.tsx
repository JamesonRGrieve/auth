'use client';
// SPDX-License-Identifier: AGPL-3.0-or-later
import PasswordField from '@jgrieve/forms/PasswordField';
import { Button } from '@jgrieve/forms/components/ui/button';
import { type ReactElement, type SyntheticEvent, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { passwordChangeProblem } from './profileModel';

type ChangeStatus = { failed: boolean; message: string } | null;

const formText = (data: FormData, name: string): string => {
  const value = data.get(name);
  return typeof value === 'string' ? value : '';
};

/** Change the signed-in user's password; the current password is required. */
export function Account({
  onChangePassword,
}: {
  onChangePassword: (current: string, next: string) => Promise<string>;
}): ReactElement {
  const [status, setStatus] = useState<ChangeStatus>(null);
  const [pending, setPending] = useState(false);

  const submit = async (form: HTMLFormElement): Promise<void> => {
    const data = new FormData(form);
    const current = formText(data, 'current-password');
    const next = formText(data, 'new-password');
    const problem = passwordChangeProblem(current, next, formText(data, 'new-password-again'));
    if (problem !== null) {
      setStatus({ failed: true, message: problem });
      return;
    }
    setPending(true);
    try {
      setStatus({ failed: false, message: await onChangePassword(current, next) });
      form.reset();
    } catch (error) {
      setStatus({ failed: true, message: error instanceof Error ? error.message : 'Your password could not be changed.' });
    } finally {
      setPending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>Change the password you sign in with.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          aria-label='Change password'
          className='grid gap-4 md:max-w-md'
          onSubmit={(event: SyntheticEvent<HTMLFormElement>) => {
            event.preventDefault();
            void submit(event.currentTarget);
          }}
        >
          <PasswordField id='current-password' name='current-password' label='Current password' />
          <PasswordField
            id='new-password'
            name='new-password'
            label='New password'
            autoComplete='new-password'
            placeholder='Enter a new password'
          />
          <PasswordField
            id='new-password-again'
            name='new-password-again'
            label='New password (again)'
            autoComplete='new-password'
            placeholder='Enter the new password again'
          />
          <Button type='submit' disabled={pending}>
            Change password
          </Button>
          {status !== null && (
            <p
              role={status.failed ? 'alert' : 'status'}
              className={status.failed ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}
            >
              {status.message}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
