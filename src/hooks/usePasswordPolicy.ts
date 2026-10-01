// SPDX-License-Identifier: AGPL-3.0-or-later
import useSWR, { type SWRResponse } from 'swr';
import { authRequest } from '../lib/api';
import { PASSWORD_POLICY_ENDPOINT, type PasswordPolicy, PasswordPolicySchema } from '../lib/passwordPolicy';

/**
 * The password rule on `authServer`. It is public, so it loads before there is a session. Pass
 * `passwords` false for an app without password sign-in (authModes.basic off): its users have no
 * password, so nothing is fetched.
 */
export function usePasswordPolicy(authServer: string, passwords: boolean): SWRResponse<PasswordPolicy, Error> {
  const url = `${authServer}${PASSWORD_POLICY_ENDPOINT}`;
  return useSWR<PasswordPolicy, Error>(passwords ? url : null, async () => authRequest(url, PasswordPolicySchema));
}
