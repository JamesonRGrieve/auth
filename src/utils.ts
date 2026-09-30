// SPDX-License-Identifier: AGPL-3.0-or-later

/** cookies-next options that scope a cookie to NEXT_PUBLIC_COOKIE_DOMAIN when one is configured. */
export const cookieDomainOptions = (): { domain?: string } => {
  const domain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;
  return domain !== undefined && domain !== '' ? { domain } : {};
};
