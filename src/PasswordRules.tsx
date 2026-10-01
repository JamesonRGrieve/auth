'use client';
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ReactElement } from 'react';
import { LuCheck, LuX } from 'react-icons/lu';
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
 */
export function PasswordRules({ id, policy, password, refused = [] }: PasswordRulesProps): ReactElement {
  return (
    <ul id={id} aria-label='Password requirements' className='grid gap-1 text-sm'>
      {activeRules(policy).map((rule) => {
        const kept = password !== '' && keepsRule(password, rule, policy) && !refused.includes(rule);
        return (
          <li key={rule} className={`flex items-center gap-2 ${kept ? 'text-muted-foreground' : 'text-foreground'}`}>
            {kept ? <LuCheck aria-hidden className='h-4 w-4' /> : <LuX aria-hidden className='h-4 w-4' />}
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
