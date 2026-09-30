// SPDX-License-Identifier: AGPL-3.0-or-later
// Signing in with an identity provider (oauth_consumer, /v1/auth/oauth). POST /authorize returns
// the provider's authorize URL and state, and sets an HttpOnly cookie binding the attempt to this
// browser; the server keeps the PKCE verifier and nonce. The provider sends the browser back to the
// close page with `code` and `state`, and POST /callback exchanges them for the session cookies.
import { z } from 'zod';
import { authRequest, authSend } from '../lib/api';
import { rememberPending } from './pending';

export const OAUTH_SIGN_IN_ENDPOINT = '/v1/auth/oauth';

const AuthorizeSchema = z.object({ authorize_url: z.url(), state: z.string() });

/** Start signing in with `provider`: remembers it for the return trip and resolves to where to send the browser. */
export async function beginSignIn(authServer: string, provider: string, storage: Storage): Promise<string> {
  const { authorize_url: authorizeUrl, state } = await authRequest(
    `${authServer}${OAUTH_SIGN_IN_ENDPOINT}/authorize`,
    AuthorizeSchema,
    { method: 'POST', body: { provider } },
  );
  rememberPending(storage, { kind: 'signIn', provider, state });
  return authorizeUrl;
}

/** Finish signing in with the code and state the provider sent back; the answer sets the session cookies. */
export async function finishSignIn(authServer: string, provider: string, code: string, state: string): Promise<void> {
  await authSend(`${authServer}${OAUTH_SIGN_IN_ENDPOINT}/callback`, {
    method: 'POST',
    body: { provider, code, state },
  });
}
