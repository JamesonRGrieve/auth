// SPDX-License-Identifier: AGPL-3.0-or-later
import useSWR, { type SWRResponse } from 'swr';
import { MFA_ENDPOINT, type MfaMethod, mfaApi } from '../mfa/mfaApi';

/** The signed-in user's MFA methods on `authServer`. */
export function useMfaMethods(authServer: string): SWRResponse<MfaMethod[], Error> {
  return useSWR<MfaMethod[], Error>(`${authServer}${MFA_ENDPOINT}`, async () => mfaApi.list(authServer));
}
