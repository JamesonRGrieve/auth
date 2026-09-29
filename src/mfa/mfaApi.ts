// SPDX-License-Identifier: AGPL-3.0-or-later
import { z } from 'zod';
import { authRequest, authSend } from '../lib/api';

export const MFA_ENDPOINT = '/v1/user/mfa';
const AUTHORIZE_ENDPOINT = '/v1/user/authorize';
const AUTHORIZE_MFA_ENDPOINT = '/v1/user/authorize/mfa';
const DEFAULT_RECOVERY_CODES = 10;

export const MfaMethodSchema = z.object({
  id: z.string(),
  method_type: z.enum(['totp', 'email', 'sms']),
  identifier: z.string().nullable().optional(),
  is_enabled: z.boolean(),
  is_primary: z.boolean(),
  /** True once the user proved they hold the factor; until then it is a pending setup. */
  verification: z.boolean(),
  last_used: z.string().nullable().optional(),
});
export type MfaMethod = z.infer<typeof MfaMethodSchema>;

const MethodEnvelopeSchema = z.object({ multifactor_method: MfaMethodSchema });
const MethodListSchema = z.object({ multifactor_methods: z.array(MfaMethodSchema) });

/** What an authenticator app needs to enrol; only available until the method is verified. */
export const TotpProvisioningSchema = z.object({ provisioning_uri: z.string(), secret: z.string() });
export type TotpProvisioning = z.infer<typeof TotpProvisioningSchema>;

const VerifiedSchema = z.object({ verified: z.boolean() });
const RecoveryCodesSchema = z.array(z.string());

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

const methodUrl = (authServer: string, id: string, action: string): string =>
  `${authServer}${MFA_ENDPOINT}/${encodeURIComponent(id)}/${action}`;

export const mfaApi = {
  list: async (authServer: string): Promise<MfaMethod[]> =>
    (await authRequest(`${authServer}${MFA_ENDPOINT}`, MethodListSchema)).multifactor_methods,

  createTotp: async (authServer: string): Promise<MfaMethod> =>
    (
      await authRequest(`${authServer}${MFA_ENDPOINT}`, MethodEnvelopeSchema, {
        method: 'POST',
        body: { multifactor_method: { method_type: 'totp' } },
      })
    ).multifactor_method,

  provisioning: async (authServer: string, id: string): Promise<TotpProvisioning> =>
    authRequest(methodUrl(authServer, id, 'totp/provisioning'), TotpProvisioningSchema),

  /** Enrol (or re-check) a method with a current code; resolves whether the code was right. */
  verify: async (authServer: string, id: string, code: string): Promise<boolean> =>
    (await authRequest(methodUrl(authServer, id, 'verify'), VerifiedSchema, { method: 'POST', body: { code } })).verified,

  /** Replace the method's recovery codes; the plaintext codes are returned this once. */
  generateRecoveryCodes: async (authServer: string, id: string, count = DEFAULT_RECOVERY_CODES): Promise<string[]> =>
    authRequest(methodUrl(authServer, id, 'recovery/generate'), RecoveryCodesSchema, {
      method: 'POST',
      body: { count },
    }),

  /** A verified method needs a current TOTP or recovery code; a pending one needs none. */
  disable: async (authServer: string, id: string, code?: string): Promise<void> =>
    authSend(methodUrl(authServer, id, 'disable'), { method: 'POST', body: code === undefined ? {} : { code } }),

  remove: async (authServer: string, id: string, code?: string): Promise<void> =>
    authSend(methodUrl(authServer, id, 'delete'), { method: 'POST', body: code === undefined ? {} : { code } }),
};

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
