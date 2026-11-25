// SPDX-License-Identifier: AGPL-3.0-or-later
import { z } from 'zod';

/**
 * The few public values an app's code needs from the instance it runs on rather than the build it
 * came from, so one build serves prod and dev with only runtime env apart (the operator, 2026-11-25).
 * Next inlines NEXT_PUBLIC_* at build; these are read from runtime env instead. On the server that is
 * process.env at call time; in the browser it is the `zx_env` cookie zephyrex's middleware sets on
 * every response from an allowlist, so prerendered pages get it too. The build's NEXT_PUBLIC_* value
 * stays the fallback. Only functional values belong here (origins, the cookie domain): what pages
 * prerender for search and sharing (title, description, OG URLs) keeps the build's prod values.
 */
export const PUBLIC_ENV_COOKIE = 'zx_env';

/** Names never served to the browser, whatever an app's allowlist says. */
const SECRET = /secret|token|password|passwd|private|credential|(^|_)key($|_)/i;

/** Whether `name` reads as a secret, which must never be made public. */
export const looksSecret = (name: string): boolean => SECRET.test(name);

/** The build's own values, named literally so Next inlines them into the browser bundle. */
const BUILT: ReadonlyMap<string, string | undefined> = new Map([
  ['APP_URI', process.env.NEXT_PUBLIC_APP_URI],
  ['COOKIE_DOMAIN', process.env.NEXT_PUBLIC_COOKIE_DOMAIN],
  ['ENV', process.env.NEXT_PUBLIC_ENV],
]);

/** What a `zx_env` cookie may hold: names to string values, nothing else. */
const PublicEnvSchema = z.record(z.string(), z.string());

const present = (value: string | undefined): string | undefined => (value === undefined || value === '' ? undefined : value);

/** The values a `zx_env` cookie carries, or none when it is missing or unreadable. */
export function decodePublicEnv(raw: string | undefined): Record<string, string> {
  if (raw === undefined || raw === '') {
    return {};
  }
  try {
    const parsed = PublicEnvSchema.safeParse(JSON.parse(decodeURIComponent(raw)));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

/** The cookie value for `values`. */
export const encodePublicEnv = (values: Readonly<Record<string, string>>): string =>
  encodeURIComponent(JSON.stringify(values));

function fromCookie(): ReadonlyMap<string, string> {
  const pair = document.cookie.split('; ').find((cookie) => cookie.startsWith(`${PUBLIC_ENV_COOKIE}=`));
  return new Map(Object.entries(decodePublicEnv(pair?.slice(PUBLIC_ENV_COOKIE.length + 1))));
}

/**
 * A public value from the instance this runs on: runtime env on the server, the `zx_env` cookie in the
 * browser, else what the build had (NEXT_PUBLIC_<name>).
 */
export function publicEnv(name: string): string | undefined {
  const runtime =
    typeof document === 'undefined'
      ? present(new Map(Object.entries(process.env)).get(name))
      : present(fromCookie().get(name));
  return runtime ?? present(BUILT.get(name));
}

/** cookies-next options scoping a cookie to the instance's cookie domain, when it has one. */
export const cookieDomainOptions = (): { domain?: string } => {
  const domain = publicEnv('COOKIE_DOMAIN');
  return domain === undefined ? {} : { domain };
};
