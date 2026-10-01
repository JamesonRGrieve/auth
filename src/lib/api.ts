// SPDX-License-Identifier: AGPL-3.0-or-later
import { z } from 'zod';
import { csrfHeaders, SESSION_CREDENTIALS } from './session';

const NO_CONTENT = 204;

export type AuthApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type AuthApiJson = string | number | boolean | null | AuthApiJson[] | { [key: string]: AuthApiJson | undefined };

export interface AuthApiInit {
  method?: AuthApiMethod;
  body?: AuthApiJson;
  /** An explicit Authorization, e.g. Basic credentials for a password login; it overrides the session cookie. */
  authorization?: string;
}

/**
 * A non-2xx answer from the auth server; `detail` is the server's message when it sent one, and
 * `failed` names the rules a refused value broke (e.g. the password policy's), when it listed them.
 */
export class AuthApiError extends Error {
  constructor(
    readonly status: number,
    readonly detail: string,
    readonly failed: readonly string[] = [],
  ) {
    super(detail);
    this.name = 'AuthApiError';
  }
}

// `detail` is a message, or a message with the rules a value broke.
const ErrorBodySchema = z.object({
  detail: z.union([z.string(), z.object({ message: z.string(), failed: z.array(z.string()).optional() })]),
});

const errorDetail = async (response: Response): Promise<{ detail: string; failed: string[] }> => {
  try {
    const parsed = ErrorBodySchema.safeParse(await response.clone().json());
    if (parsed.success) {
      const { detail } = parsed.data;
      return typeof detail === 'string' ? { detail, failed: [] } : { detail: detail.message, failed: detail.failed ?? [] };
    }
  } catch {
    // Not JSON: fall back to the raw text below.
  }
  const text = await response.text();
  return { detail: text === '' ? response.statusText : text, failed: [] };
};

const send = async (url: string, { method = 'GET', body, authorization }: AuthApiInit): Promise<Response> => {
  const response = await fetch(url, {
    method,
    credentials: SESSION_CREDENTIALS,
    headers: {
      'Content-Type': 'application/json',
      ...csrfHeaders(method),
      ...(authorization === undefined ? {} : { Authorization: authorization }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    const { detail, failed } = await errorDetail(response);
    throw new AuthApiError(response.status, detail, failed);
  }
  return response;
};

/** Call the auth server as the signed-in user and validate the answer against `schema`. */
export async function authRequest<T>(url: string, schema: z.ZodType<T>, init: AuthApiInit = {}): Promise<T> {
  const response = await send(url, init);
  return schema.parse(response.status === NO_CONTENT ? undefined : await response.json());
}

/** How many rows to ask for per page when walking a list route. */
export const LIST_PAGE_SIZE = 100;

const ListPageSchema = z.looseObject({ pagination: z.object({ has_more: z.boolean() }).optional() });

/**
 * Every row of a paginated list route (`{ <key>: [...], pagination: { has_more } }`), walking
 * `offset`/`limit` pages until the server says there are no more. Each page decides whether
 * there is a next, so they are fetched one after another.
 */
export async function authList<T>(url: string, key: string, itemSchema: z.ZodType<T>, offset = 0): Promise<T[]> {
  const separator = url.includes('?') ? '&' : '?';
  const page = await authRequest(`${url}${separator}offset=${offset}&limit=${LIST_PAGE_SIZE}`, ListPageSchema);
  const items = z.array(itemSchema).parse(new Map(Object.entries(page)).get(key));
  if (page.pagination?.has_more !== true || items.length === 0) {
    return items;
  }
  return [...items, ...(await authList(url, key, itemSchema, offset + LIST_PAGE_SIZE))];
}

/** Call the auth server as the signed-in user when the answer carries nothing the caller reads. */
export async function authSend(url: string, init: AuthApiInit = {}): Promise<void> {
  await send(url, init);
}
