// SPDX-License-Identifier: AGPL-3.0-or-later
import { z } from 'zod';

/** The follow-up steps a successful registration may ask for. Other fields are ignored. */
export const RegisterResponseSchema = z
  .object({
    verify_email: z.boolean().optional(),
    verify_sms: z.boolean().optional(),
  })
  .nullish();

export type RegisterResponseFlags = z.infer<typeof RegisterResponseSchema>;

/** The login page (`loginPath`) a freshly registered user is sent to, carrying any follow-up steps the server requested. */
export const loginRedirectPath = (loginPath: string, flags: RegisterResponseFlags): string => {
  const params = new URLSearchParams();
  if (flags?.verify_email === true) {
    params.set('verify_email', 'true');
  }
  if (flags?.verify_sms === true) {
    params.set('verify_sms', 'true');
  }
  const query = params.toString();
  return query === '' ? loginPath : `${loginPath}?${query}`;
};
