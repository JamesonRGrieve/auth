'use client';
// SPDX-License-Identifier: AGPL-3.0-or-later
import { Button } from '@jgrieve/forms/components/ui/button';
import { Input } from '@jgrieve/forms/components/ui/input';
import { Label } from '@jgrieve/forms/components/ui/label';
import { type ReactElement, useState } from 'react';

const HINT_ID = 'mfa-code-hint';
const PROBLEM_ID = 'mfa-code-problem';

/** The second login step: a current authenticator code, or a recovery code if the phone is out of reach. */
export function MfaChallenge({
  onSubmit,
  onStartOver,
}: {
  /** Resolves with why the code was refused, or null once signed in. */
  onSubmit: (code: string) => Promise<string | null>;
  onStartOver: () => void;
}): ReactElement {
  const [problem, setProblem] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      aria-label='Two-factor code'
      className='flex flex-col gap-4'
      onSubmit={(event) => {
        event.preventDefault();
        const value = new FormData(event.currentTarget).get('code');
        const code = typeof value === 'string' ? value.trim() : '';
        setPending(true);
        void (async (): Promise<void> => {
          setProblem(await onSubmit(code));
          setPending(false);
        })();
      }}
    >
      <Label htmlFor='mfa-code'>Authenticator or recovery code</Label>
      <Input
        id='mfa-code'
        name='code'
        autoComplete='one-time-code'
        required
        aria-invalid={problem !== null}
        aria-describedby={problem === null ? HINT_ID : `${HINT_ID} ${PROBLEM_ID}`}
      />
      <p id={HINT_ID} className='text-sm text-muted-foreground'>
        Enter the 6-digit code from your authenticator app, or one of your recovery codes.
      </p>
      <Button type='submit' disabled={pending}>
        Verify
      </Button>
      <Button type='button' variant='ghost' onClick={onStartOver}>
        Start over
      </Button>
      {problem !== null && (
        <p id={PROBLEM_ID} role='alert' className='text-sm text-destructive'>
          {problem}
        </p>
      )}
    </form>
  );
}
