// SPDX-License-Identifier: AGPL-3.0-or-later
import { GraphQLClient } from 'graphql-request';
import { csrfHeaders, SESSION_CREDENTIALS } from '../lib/session';

/**
 * A GraphQL client for `authServer` that rides the session cookie. GraphQL is always POSTed,
 * so each request carries the current CSRF token (read per request, as it rotates with the session).
 */
export const createGraphQLClient = (authServer: string): GraphQLClient =>
  new GraphQLClient(`${authServer}/graphql`, {
    credentials: SESSION_CREDENTIALS,
    headers: () => csrfHeaders('POST'),
  });

/**
 * Helper to chain mutations between hooks
 * @param parentHook - Parent hook containing mutate function
 * @param currentHook - Current hook's mutate function
 */
export const chainMutations = <T>(
  parentHook: { mutate: () => Promise<unknown> },
  originalMutate: () => Promise<T>,
): (() => Promise<T>) => {
  return async (): Promise<T> => {
    await parentHook.mutate();
    return originalMutate();
  };
};
