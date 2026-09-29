// SPDX-License-Identifier: AGPL-3.0-or-later

export type RegisterResponseFlags = {
  otp_uri?: string;
  verify_email?: boolean;
  verify_sms?: boolean;
};

const LOGIN_PATH = '/user/login';

/** Login URL a freshly registered user is sent to, carrying any follow-up steps the server requested. */
export const loginRedirectPath = (flags: RegisterResponseFlags | undefined): string => {
  const params = new URLSearchParams();
  if (flags?.otp_uri !== undefined && flags.otp_uri !== '') {
    params.set('otp_uri', flags.otp_uri);
  }
  if (flags?.verify_email === true) {
    params.set('verify_email', 'true');
  }
  if (flags?.verify_sms === true) {
    params.set('verify_sms', 'true');
  }
  const query = params.toString();
  return query === '' ? LOGIN_PATH : `${LOGIN_PATH}?${query}`;
};
