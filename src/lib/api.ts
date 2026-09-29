// SPDX-License-Identifier: AGPL-3.0-or-later
import { getCookie } from 'cookies-next/client';
import { z } from 'zod';

const NO_CONTENT = 204;

export type AuthApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type AuthApiJson = string | number | boolean | null | AuthApiJson[] | { [key: string]: AuthApiJson | undefined };

export interface AuthApiInit {
  method?: AuthApiMethod;
  body?: AuthApiJson;
}

/** A non-2xx answer from the auth server; `detail` is the server's message when it sent one. */
export class AuthApiError extends Error {
  constructor(
    readonly status: number,
    readonly detail: string,
  ) {
    super(detail);
    this.name = 'AuthApiError';
  }
}

const ErrorBodySchema = z.object({ detail: z.string() });

const sessionHeaders = (): Record<string, string> => {
  const jwt = getCookie('jwt');
  return typeof jwt === 'string' && jwt !== '' ? { Authorization: `Bearer ${jwt}` } : {};
};

const errorDetail = async (response: Response): Promise<string> => {
  try {
    const parsed = ErrorBodySchema.safeParse(await response.clone().json());
    if (parsed.success) {
      return parsed.data.detail;
    }
  } catch {
    // Not JSON: fall back to the raw text below.
  }
  const text = await response.text();
  return text === '' ? response.statusText : text;
};

const send = async (url: string, { method = 'GET', body }: AuthApiInit): Promise<Response> => {
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...sessionHeaders() },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    throw new AuthApiError(response.status, await errorDetail(response));
  }
  return response;
};

/** Call the auth server as the signed-in user and validate the answer against `schema`. */
export async function authRequest<T>(url: string, schema: z.ZodType<T>, init: AuthApiInit = {}): Promise<T> {
  const response = await send(url, init);
  return schema.parse(response.status === NO_CONTENT ? undefined : await response.json());
}

/** Call the auth server as the signed-in user when the answer carries nothing the caller reads. */
export async function authSend(url: string, init: AuthApiInit = {}): Promise<void> {
  await send(url, init);
}
