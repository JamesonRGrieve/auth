// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import {
  activeRules,
  brokenRules,
  knownRules,
  PASSWORD_RULES,
  type PasswordPolicy,
  PasswordPolicySchema,
  ruleText,
} from './passwordPolicy';

const POLICY: PasswordPolicy = { min_length: 8, max_bytes: 72, require_letter: true, require_digit: true };

describe('PasswordPolicySchema', () => {
  it('reads the server’s policy', () => {
    expect(PasswordPolicySchema.parse(POLICY)).toEqual(POLICY);
  });

  it('rejects a policy missing a rule', () => {
    expect(PasswordPolicySchema.safeParse({ min_length: 8, max_bytes: 72, require_letter: true }).success).toBe(false);
  });
});

describe('brokenRules', () => {
  it('accepts a password that keeps every rule', () => {
    expect(brokenRules('correct horse 9', POLICY)).toEqual([]);
  });

  it('lists every broken rule in the server’s order', () => {
    expect(brokenRules('', POLICY)).toEqual(['min_length', 'require_letter', 'require_digit']);
    expect(brokenRules('abcdefgh', POLICY)).toEqual(['require_digit']);
    expect(brokenRules('12345678', POLICY)).toEqual(['require_letter']);
  });

  it('counts the length in characters but the limit in UTF-8 bytes', () => {
    expect(brokenRules('ééééééé1', POLICY)).toEqual([]);
    // 36 two-byte letters is 72 bytes; one more digit makes 73.
    expect(brokenRules(`${'é'.repeat(36)}1`, POLICY)).toEqual(['max_bytes']);
    expect(brokenRules(`${'é'.repeat(35)}1`, POLICY)).toEqual([]);
  });

  it('counts letters and digits from any script', () => {
    expect(brokenRules('пароль١٢٣', POLICY)).toEqual([]);
  });

  it('imposes no requirement the policy switches off', () => {
    const lenient = { ...POLICY, require_letter: false, require_digit: false };
    expect(activeRules(lenient)).toEqual(['min_length', 'max_bytes']);
    expect(brokenRules('12345678', lenient)).toEqual([]);
  });
});

describe('ruleText', () => {
  it('states each rule with the policy’s numbers', () => {
    expect(ruleText('min_length', POLICY)).toBe('At least 8 characters');
    expect(ruleText('max_bytes', POLICY)).toContain('72 bytes');
    expect(ruleText('require_letter', POLICY)).toBe('At least one letter');
    expect(ruleText('require_digit', POLICY)).toBe('At least one digit');
  });

  it('gives every rule its own wording, so a new rule cannot pass as another', () => {
    const texts = PASSWORD_RULES.map((rule) => ruleText(rule, POLICY));
    expect(new Set(texts).size).toBe(PASSWORD_RULES.length);
  });
});

describe('knownRules', () => {
  it('keeps the server’s failed names this client knows, in rule order', () => {
    expect(knownRules(['require_digit', 'min_length', 'something_new'])).toEqual(['min_length', 'require_digit']);
  });
});
