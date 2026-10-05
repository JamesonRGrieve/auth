// SPDX-License-Identifier: AGPL-3.0-or-later
// Passkeys and security keys (the server's webauthn_consumer): the browser's two ceremonies, signing
// in with a passkey, and answering a second-factor challenge with a security key. Registering and
// managing them is @zephyrex/webauthn-consumer's, which runs its ceremony through `createPasskey`.
import { z } from 'zod';
import { AuthApiError, authRequest } from '../lib/api';

const WEBAUTHN_ENDPOINT = '/v1/webauthn';

const DescriptorSchema = z.object({
  id: z.string(),
  type: z.string(),
  transports: z.array(z.string()).exactOptional(),
});

/** The server's options for navigator.credentials.create(), as WebAuthn JSON. */
const CreationOptionsSchema = z.object({
  challenge: z.string(),
  rp: z.object({ id: z.string().exactOptional(), name: z.string() }),
  user: z.object({ id: z.string(), name: z.string(), displayName: z.string() }),
  pubKeyCredParams: z.array(z.object({ alg: z.number(), type: z.literal('public-key') })),
  timeout: z.number().exactOptional(),
  excludeCredentials: z.array(DescriptorSchema).exactOptional(),
  authenticatorSelection: z
    .object({
      authenticatorAttachment: z.enum(['platform', 'cross-platform']).exactOptional(),
      residentKey: z.enum(['discouraged', 'preferred', 'required']).exactOptional(),
      requireResidentKey: z.boolean().exactOptional(),
      userVerification: z.enum(['discouraged', 'preferred', 'required']).exactOptional(),
    })
    .exactOptional(),
  attestation: z.string().exactOptional(),
  hints: z.array(z.string()).exactOptional(),
  extensions: z.object({ credProps: z.boolean().exactOptional() }).exactOptional(),
});

/** The server's options for navigator.credentials.get(), as WebAuthn JSON. */
const RequestOptionsSchema = z.object({
  challenge: z.string(),
  timeout: z.number().exactOptional(),
  rpId: z.string().exactOptional(),
  allowCredentials: z.array(DescriptorSchema).exactOptional(),
  userVerification: z.string().exactOptional(),
  hints: z.array(z.string()).exactOptional(),
});

/** A registration the server opened: its id, named again when finishing it, and the browser's options. */
export const CreationCeremonySchema = z.object({ ceremony_id: z.string(), public_key: CreationOptionsSchema });
export type CreationOptions = z.infer<typeof CreationOptionsSchema>;
/** A sign-in or second-factor ceremony the server opened. */
const RequestCeremonySchema = z.object({ ceremony_id: z.string(), public_key: RequestOptionsSchema });

/** What a ceremony hands back to the server: the credential as PublicKeyCredential.toJSON() makes it. */
const CredentialJsonSchema = z.record(z.string(), z.json());
export type CredentialJson = z.infer<typeof CredentialJsonSchema>;

/** The session a passkey sign-in gives, as a password login's; the server has set its cookies. */
const SignedInSchema = z.object({ token: z.string() });

/** Whether this browser can run the ceremonies here (it reads and writes WebAuthn JSON). */
export const passkeysSupported = (): boolean =>
  typeof window !== 'undefined' &&
  'PublicKeyCredential' in window &&
  'parseCreationOptionsFromJSON' in PublicKeyCredential &&
  'parseRequestOptionsFromJSON' in PublicKeyCredential;

const NOT_ALLOWED = 'NotAllowedError';
const INVALID_STATE = 'InvalidStateError';

/** Why a ceremony ended without signing in or registering, in words: the browser's reason, or the server's. */
export function ceremonyProblem(error: Error): string {
  if (error instanceof DOMException && error.name === NOT_ALLOWED) {
    return 'The request was cancelled, or it timed out.';
  }
  if (error instanceof DOMException && error.name === INVALID_STATE) {
    return 'This passkey or security key is already registered.';
  }
  return error instanceof AuthApiError ? error.detail : error.message;
}

const asJson = (credential: Credential | null): CredentialJson => {
  if (!(credential instanceof PublicKeyCredential)) {
    throw new Error('The browser gave no passkey.');
  }
  return CredentialJsonSchema.parse(credential.toJSON());
};

/** Makes a passkey or security key from the server's creation options; resolves to it as JSON for the server. */
export async function createPasskey(publicKey: CreationOptions): Promise<CredentialJson> {
  const options = PublicKeyCredential.parseCreationOptionsFromJSON(publicKey);
  return asJson(await navigator.credentials.create({ publicKey: options }));
}

/** Asks for a passkey or security key with the server's request options; resolves to the assertion as JSON. */
async function getPasskey(publicKey: z.infer<typeof RequestOptionsSchema>): Promise<CredentialJson> {
  const options = PublicKeyCredential.parseRequestOptionsFromJSON(publicKey);
  return asJson(await navigator.credentials.get({ publicKey: options }));
}

/**
 * Signs in with a passkey, the account's own when `email` names one, any the browser holds otherwise.
 * The passkey is both factors, so no challenge follows; resolves once the server set the session cookies.
 */
export async function signInWithPasskey(authServer: string, email: string | null): Promise<void> {
  const opened = await authRequest(`${authServer}${WEBAUTHN_ENDPOINT}/authenticate/options`, RequestCeremonySchema, {
    method: 'POST',
    body: email === null ? {} : { email },
  });
  const credential = await getPasskey(opened.public_key);
  await authRequest(`${authServer}${WEBAUTHN_ENDPOINT}/authenticate/verify`, SignedInSchema, {
    method: 'POST',
    body: { ceremony_id: opened.ceremony_id, credential },
  });
}

/** Answers a second-factor challenge with one of the account's security keys; resolves once signed in. */
export async function answerWithSecurityKey(authServer: string, challengeToken: string): Promise<void> {
  const opened = await authRequest(`${authServer}${WEBAUTHN_ENDPOINT}/mfa/options`, RequestCeremonySchema, {
    method: 'POST',
    body: { challenge_token: challengeToken },
  });
  const credential = await getPasskey(opened.public_key);
  await authRequest(`${authServer}${WEBAUTHN_ENDPOINT}/mfa/verify`, SignedInSchema, {
    method: 'POST',
    body: { ceremony_id: opened.ceremony_id, challenge_token: challengeToken, credential },
  });
}
