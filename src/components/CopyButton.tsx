'use client';
// SPDX-License-Identifier: AGPL-3.0-or-later
import { Button } from '@jgrieve/forms/components/ui/button';
import { type ReactElement, useEffect, useState } from 'react';
import { LuCheck as Check, LuCopy as Copy } from 'react-icons/lu';

const COPIED_FEEDBACK_MS = 2000;

/** Copies `content` to the clipboard and confirms it briefly. */
export function CopyButton({ content, label = 'Copy' }: { content: string; label?: string }): ReactElement {
  const [outcome, setOutcome] = useState<'copied' | 'failed' | null>(null);

  useEffect(() => {
    if (outcome === null) {
      return undefined;
    }
    const timer = setTimeout(() => {
      setOutcome(null);
    }, COPIED_FEEDBACK_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [outcome]);

  const isCopied = outcome === 'copied';
  const text = outcome === 'failed' ? 'Copy failed' : isCopied ? 'Copied!' : label;

  return (
    <Button
      variant='outline'
      size='sm'
      type='button'
      className='flex items-center gap-2'
      onClick={() => {
        void (async (): Promise<void> => {
          try {
            await navigator.clipboard.writeText(content);
            setOutcome('copied');
          } catch {
            setOutcome('failed');
          }
        })();
      }}
    >
      {isCopied ? <Check aria-hidden='true' className='w-4 h-4' /> : <Copy aria-hidden='true' className='w-4 h-4' />}
      <span aria-live='polite'>{text}</span>
    </Button>
  );
}
