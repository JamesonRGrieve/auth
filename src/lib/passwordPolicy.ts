// SPDX-License-Identifier: AGPL-3.0-or-later
import { z } from 'zod';

/** The server's password rule, public so registration can show it before there is a session. */
export const PASSWORD_POLICY_ENDPOINT = '/v1/user/password-policy';

export const PasswordPolicySchema = z.object({
  min_length: z.number().int().nonnegative(),
  /** bcrypt hashes at most this many bytes of UTF-8, so the limit is bytes, not characters. */
  max_bytes: z.number().int().positive(),
  require_letter: z.boolean(),
  require_digit: z.boolean(),
});
export type PasswordPolicy = z.infer<typeof PasswordPolicySchema>;

/** The rules, in the order the server lists the ones a password breaks. */
export const PASSWORD_RULES = ['min_length', 'max_bytes', 'require_letter', 'require_digit'] as const;
export type PasswordRule = (typeof PASSWORD_RULES)[number];

const LETTER = /\p{L}/u;
const DIGIT = /\p{Nd}/u;

const utf8Bytes = (text: string): number => new TextEncoder().encode(text).length;

/** The rules `policy` actually imposes; a requirement switched off is no rule at all. */
export function activeRules(policy: PasswordPolicy): PasswordRule[] {
  return PASSWORD_RULES.filter(
    (rule) => (rule !== 'require_letter' || policy.require_letter) && (rule !== 'require_digit' || policy.require_digit),
  );
}

/** Whether `password` keeps `rule` under `policy`. */
export function keepsRule(password: string, rule: PasswordRule, policy: PasswordPolicy): boolean {
  if (rule === 'min_length') {
    return [...password].length >= policy.min_length;
  }
  if (rule === 'max_bytes') {
    return utf8Bytes(password) <= policy.max_bytes;
  }
  if (rule === 'require_letter') {
    return !policy.require_letter || LETTER.test(password);
  }
  return !policy.require_digit || DIGIT.test(password);
}

/** The rules `password` breaks, in the server's order; empty when the server would accept it. */
export function brokenRules(password: string, policy: PasswordPolicy): PasswordRule[] {
  return activeRules(policy).filter((rule) => !keepsRule(password, rule, policy));
}

/** How a rule reads to the person choosing a password. */
export function ruleText(rule: PasswordRule, policy: PasswordPolicy): string {
  if (rule === 'min_length') {
    return `At least ${policy.min_length} characters`;
  }
  if (rule === 'max_bytes') {
    return `No more than ${policy.max_bytes} bytes (accented letters and emoji take more than one)`;
  }
  if (rule === 'require_letter') {
    return 'At least one letter';
  }
  return 'At least one digit';
}

/** The server's `failed` names that are rules this client knows. */
export function knownRules(failed: readonly string[]): PasswordRule[] {
  return PASSWORD_RULES.filter((rule) => failed.includes(rule));
}
