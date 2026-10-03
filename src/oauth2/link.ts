// SPDX-License-Identifier: AGPL-3.0-or-later
// Linking another identity provider to the signed-in user (oauth_consumer, /v1/auth/oauth). POST
// /link/authorize returns the provider's authorize URL and state, binding the attempt to this
// browser with an HttpOnly cookie; the provider sends the browser back to the close page with
// `code` and `state`, and POST /link/callback finishes the link. The user's linked identities are
// rows at /identity, each unlinked by deleting it.
import { z } from 'zod';
import { authList, authRequest, authSend } from '../lib/api';
import { rememberPending } from './pending';
import { OAUTH_SIGN_IN_ENDPOINT } from './signIn';

const IDENTITY_ENDPOINT = `${OAUTH_SIGN_IN_ENDPOINT}/identity`;
/** The identity list's envelope: the server names it after its model (OAuthIdentity). */
const IDENTITIES_KEY = 'o_auth_identities';

/** An identity provider the server is configured for. */
export const LinkProviderSchema = z.object({
  /** What to pass as `provider`: the instance's name, or the public name when there is one instance. */
  name: z.string(),
  /** The provider's public name (google, github, oidc…). */
  provider: z.string(),
  friendly_name: z.string(),
});
export type LinkProvider = z.infer<typeof LinkProviderSchema>;

const LinkProvidersSchema = z.object({ providers: z.array(LinkProviderSchema) });

/** One of the user's accounts at an identity provider; the server never returns its tokens. */
export const IdentitySchema = z.object({
  id: z.string(),
  provider_instance_id: z.string(),
  provider: z.string(),
  email: z.string().nullable().optional(),
  display_name: z.string().nullable().optional(),
  // The row's version, sent back verbatim as If-Match when it is unlinked.
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});
export type Identity = z.infer<typeof IdentitySchema>;

const AuthorizeSchema = z.object({ authorize_url: z.url(), state: z.string() });

/** The identity providers the server can link. */
export async function linkableProviders(authServer: string): Promise<LinkProvider[]> {
  const { providers } = await authRequest(`${authServer}${OAUTH_SIGN_IN_ENDPOINT}/providers`, LinkProvidersSchema);
  return providers;
}

/** The signed-in user's linked identities. */
export async function identities(authServer: string): Promise<Identity[]> {
  return authList(`${authServer}${IDENTITY_ENDPOINT}`, IDENTITIES_KEY, IdentitySchema);
}

/** Start linking `provider`: remembers it for the return trip and resolves to where to send the browser. */
export async function beginLink(authServer: string, provider: string, storage: Storage): Promise<string> {
  const { authorize_url: authorizeUrl, state } = await authRequest(
    `${authServer}${OAUTH_SIGN_IN_ENDPOINT}/link/authorize`,
    AuthorizeSchema,
    { method: 'POST', body: { provider } },
  );
  rememberPending(storage, { kind: 'link', provider, state });
  return authorizeUrl;
}

/** Finish linking `provider` with the code and state the provider sent back. */
export async function finishLink(authServer: string, provider: string, code: string, state: string): Promise<void> {
  await authSend(`${authServer}${OAUTH_SIGN_IN_ENDPOINT}/link/callback`, {
    method: 'POST',
    body: { provider, code, state },
  });
}

/**
 * Unlink `identity`, guarded by it as loaded: AuthStaleWriteError when it changed since (a sign-in
 * with it updates it), so the caller shows it as it is now before the user unlinks it again.
 */
export async function unlink(authServer: string, identity: Identity): Promise<void> {
  await authSend(`${authServer}${IDENTITY_ENDPOINT}/${encodeURIComponent(identity.id)}`, {
    method: 'DELETE',
    seen: identity,
  });
}
