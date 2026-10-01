// SPDX-License-Identifier: AGPL-3.0-or-later
// Signing in: a password (or a magic link), then the second factor when the account has one.
// Managing second factors is the auth_mfa extension's, in @zephyrex/auth-mfa.
import { z } from 'zod';
import { AuthApiError, authRequest, authSend } from '../lib/api';

const AUTHORIZE_ENDPOINT = '/v1/user/authorize';
const AUTHORIZE_MFA_ENDPOINT = '/v1/user/authorize/mfa';

/** Password accepted, but a second factor is still owed. `challenge_token` is single-use and short-lived. */
const MfaChallengeSchema = z.object({
  mfa_required: z.literal(true),
  challenge_token: z.string(),
  methods: z.array(z.object({ id: z.string(), method_type: z.string() })),
});
export type MfaChallenge = z.infer<typeof MfaChallengeSchema>;

const LoginSessionSchema = z.object({ token: z.string() });
export type LoginSession = z.infer<typeof LoginSessionSchema>;

const LoginAnswerSchema = z.union([MfaChallengeSchema, LoginSessionSchema]);
export type LoginAnswer = z.infer<typeof LoginAnswerSchema>;

export const isMfaChallenge = (answer: LoginAnswer): answer is MfaChallenge => 'mfa_required' in answer;

/** Step one of a password login: a session, or a challenge for the second factor. */
export async function passwordLogin(
  authServer: string,
  email: string,
  password: string,
  endpoint: string = AUTHORIZE_ENDPOINT,
): Promise<LoginAnswer> {
  const credentials = btoa(String.fromCodePoint(...new TextEncoder().encode(`${email}:${password}`)));
  return authRequest(`${authServer}${endpoint}`, LoginAnswerSchema, {
    method: 'POST',
    authorization: `Basic ${credentials}`,
  });
}

/** Step two: trade the challenge and a current TOTP or recovery code for a session. */
export async function completeMfaLogin(authServer: string, challengeToken: string, code: string): Promise<LoginSession> {
  return authRequest(`${authServer}${AUTHORIZE_MFA_ENDPOINT}`, LoginSessionSchema, {
    method: 'POST',
    body: { challenge_token: challengeToken, code: code.trim() },
  });
}

const UNAUTHORIZED = 401;

/**
 * Answer a second-factor challenge, whichever sign-in raised it. Resolves with why the code was
 * refused, or null once the server has set the session cookies.
 */
export async function answerMfaChallenge(authServer: string, challengeToken: string, code: string): Promise<string | null> {
  try {
    await completeMfaLogin(authServer, challengeToken, code);
    return null;
  } catch (error) {
    if (error instanceof AuthApiError && error.status === UNAUTHORIZED) {
      return `${error.detail}. Try the current code, or start over if it keeps failing.`;
    }
    return error instanceof Error ? error.message : 'The code could not be checked.';
  }
}

export const MAGIC_LINK_ENDPOINT = '/v1/auth/magic-link';

/** Email a sign-in link to `email`. The server answers the same whether or not it has an account. */
export async function requestMagicLink(authServer: string, email: string): Promise<void> {
  await authSend(`${authServer}${MAGIC_LINK_ENDPOINT}/request`, { method: 'POST', body: { email } });
}

/** Redeem the token from a sign-in link: a session, or a challenge for the second factor. */
export async function verifyMagicLink(authServer: string, token: string): Promise<LoginAnswer> {
  return authRequest(`${authServer}${MAGIC_LINK_ENDPOINT}/verify`, LoginAnswerSchema, {
    method: 'POST',
    body: { token },
  });
}
