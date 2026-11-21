'use client';
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ReactElement } from 'react';
import { LuCheck, LuDot, LuX } from 'react-icons/lu';
import { activeRules, keepsRule, type PasswordPolicy, type PasswordRule, ruleText } from './lib/passwordPolicy';

export type PasswordRulesProps = {
  id: string;
  policy: PasswordPolicy;
  password: string;
  /** Rules the server said a submitted password broke; shown as broken until the password changes. */
  refused?: readonly PasswordRule[] | undefined;
};

/**
 * The server's password rule as a checklist that follows what is typed, so the person knows what
 * is still missing before they submit. The field it describes points here with aria-describedby.
 * Before anything is typed each rule is a quiet dot, not a cross: nothing has failed yet.
 */
export function PasswordRules({ id, policy, password, refused = [] }: PasswordRulesProps): ReactElement {
  return (
    <ul id={id} aria-label='Password requirements' className='grid gap-1 text-sm'>
      {activeRules(policy).map((rule) => {
        const kept = password !== '' && keepsRule(password, rule, policy) && !refused.includes(rule);
        const untouched = password === '' && !refused.includes(rule);
        const mark = kept ? (
          <LuCheck aria-hidden className='h-4 w-4 shrink-0' />
        ) : untouched ? (
          <LuDot aria-hidden className='h-4 w-4 shrink-0' />
        ) : (
          <LuX aria-hidden className='h-4 w-4 shrink-0' />
        );
        return (
          <li
            key={rule}
            className={`flex items-center gap-2 ${kept || untouched ? 'text-muted-foreground' : 'text-foreground'}`}
          >
            {mark}
            <span>
              {ruleText(rule, policy)}
              <span className='sr-only'>{kept ? ': met' : ': not met yet'}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
