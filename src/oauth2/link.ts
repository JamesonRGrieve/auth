// SPDX-License-Identifier: AGPL-3.0-or-later
// Linking an external account (auth_oauth2_client). The server holds the client credentials and
// chooses the redirect URI: GET /connect/{provider} returns the provider's authorize URL and a
// state bound to this user; the provider sends the browser back with `code` and `state`, and the
// close page finishes with POST /callback/{provider}.
import { z } from 'zod';
import { authRequest, authSend } from '../lib/api';
import { rememberPending } from './pending';

export const OAUTH2_CLIENT_ENDPOINT = '/v1/oauth2_client';

export const LinkProvidersSchema = z.object({
  providers: z.array(z.object({ name: z.string(), configured: z.boolean() })),
});

export const ConnectionSchema = z.object({
  provider: z.string(),
  account_email: z.string().nullable().optional(),
  account_name: z.string().nullable().optional(),
});
export type Connection = z.infer<typeof ConnectionSchema>;

export const ConnectionsSchema = z.object({ connections: z.array(ConnectionSchema) });

const ConnectSchema = z.object({ authorize_url: z.url(), state: z.string() });

const endpoint = (authServer: string, path: string): string => `${authServer}${OAUTH2_CLIENT_ENDPOINT}${path}`;

/** The providers the server can link that have credentials configured. */
export async function linkableProviders(authServer: string): Promise<string[]> {
  const { providers } = await authRequest(endpoint(authServer, '/providers'), LinkProvidersSchema);
  return providers.filter((provider) => provider.configured).map((provider) => provider.name);
}

export async function connections(authServer: string): Promise<Connection[]> {
  return authRequest(endpoint(authServer, '/connections'), ConnectionsSchema).then((response) => response.connections);
}

/** Start linking `provider`: remembers it for the return trip and resolves to where to send the browser. */
export async function beginLink(authServer: string, provider: string, storage: Storage): Promise<string> {
  const { authorize_url: authorizeUrl, state } = await authRequest(
    endpoint(authServer, `/connect/${encodeURIComponent(provider)}`),
    ConnectSchema,
  );
  rememberPending(storage, { kind: 'link', provider, state });
  return authorizeUrl;
}

/** Finish linking `provider` with the code and state the provider sent back. */
export async function finishLink(authServer: string, provider: string, code: string, state: string): Promise<void> {
  await authSend(endpoint(authServer, `/callback/${encodeURIComponent(provider)}`), {
    method: 'POST',
    body: { code, state },
  });
}

export async function unlink(authServer: string, provider: string): Promise<void> {
  await authSend(endpoint(authServer, `/disconnect/${encodeURIComponent(provider)}`), { method: 'DELETE' });
}
