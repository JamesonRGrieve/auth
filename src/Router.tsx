'use client';
// SPDX-License-Identifier: AGPL-3.0-or-later

import { notFound, useSearchParams } from 'next/navigation.js';
import type { ReactNode } from 'react';
import { useAuthServer } from './AuthServerContext';
import { AuthenticationContext } from './AuthenticationContext';
import ErrorPage, { type ErrorPageProps } from './ErrorPage';
import User, { type IdentifyProps } from './Identify';
import Login, { type LoginProps } from './Login';
import Logout, { type LogoutProps } from './Logout';
import MagicLink, { type MagicLinkProps } from './MagicLink';
import Register, { type RegisterProps } from './Register';
import Subscribe, { type SubscribeProps } from './Subscribe';
import deepMerge from './lib/objects';
import Close, { type CloseProps } from './oauth2/Close';

export { useAuthentication } from './useAuthentication';

type RouterPageProps = {
  path: string;
  heading?: string | undefined;
};

/** Another way to sign in, linked from the welcome page: an app page under `authPath`. */
export interface SignInAlternative {
  label: string;
  /** Relative to `authPath`, e.g. `/pair`. */
  path: string;
}

export type AuthenticationConfig = {
  identify: RouterPageProps & { props?: IdentifyProps };
  login: RouterPageProps & { props?: LoginProps };
  /** Where signing in lands: the app's own account page, mounted there through `additionalPages`. */
  manage: RouterPageProps;
  register: RouterPageProps & { props?: RegisterProps };
  close: RouterPageProps & { props?: CloseProps };
  /** Where sign-in links land; point the server's MAGIC_LINK_BASE_URL at `<app><authPath><path>`. */
  magic: RouterPageProps & { props?: MagicLinkProps };
  subscribe: RouterPageProps & { props?: SubscribeProps };
  logout: RouterPageProps & { props?: LogoutProps };
  error: RouterPageProps & { props?: ErrorPageProps };
  authModes: {
    basic: boolean;
    magical: boolean;
  };
  /**
   * Other ways to sign in that the app mounts through `additionalPages` (e.g. pairing with a
   * signed-in device), each linked from the welcome page.
   */
  signInAlternatives: readonly SignInAlternative[];
  /**
   * Identity providers offered for sign-in (the server's oauth_consumer names, e.g. `google`).
   * None means no OAuth sign-in; with no email mode either, the welcome page offers only these.
   */
  oauthProviders: readonly string[];
  authServer: string;
  appName: string;
  /** Where these pages are mounted on the app's origin, e.g. `/user`. */
  authPath: string;
  recaptchaSiteKey?: string | undefined;
};

// `authServer` comes from the app's AuthServerProvider, its single configured API base.
const pageConfigDefaults: Omit<AuthenticationConfig, 'authServer'> = {
  identify: {
    path: '/',
    heading: 'Welcome',
  },
  login: {
    path: '/login',
    heading: 'Please Authenticate',
  },
  manage: {
    path: '/manage',
    heading: 'Account Management',
  },
  register: {
    path: '/register',
    heading: 'Welcome, Please Register',
  },
  close: {
    path: '/close',
    heading: '',
  },
  magic: {
    path: '/magic',
    heading: '',
  },
  subscribe: {
    path: '/subscribe',
    heading: 'Please Subscribe to Access The Application',
  },
  logout: {
    path: '/logout',
    heading: '',
  },
  error: {
    path: '/error',
    heading: 'Error',
  },
  appName: '',
  authPath: '/user',
  authModes: {
    basic: true,
    magical: false,
  },
  oauthProviders: [],
  signInAlternatives: [],
};

export default function AuthRouter({
  params,
  searchParams,
  corePagesConfig = pageConfigDefaults,
  additionalPages = {},
}: {
  params: { slug?: string[] };
  searchParams?: Record<string, string> | URLSearchParams;
  corePagesConfig?: Partial<AuthenticationConfig>;
  additionalPages?: { [key: string]: ReactNode };
}): ReactNode {
  // Use Next.js 15 hooks for search params if not provided directly
  const routeSearchParams = useSearchParams();

  const paramsToUse = searchParams instanceof URLSearchParams ? searchParams : routeSearchParams;
  const searchParamsObject: Record<string, string> = {
    ...Object.fromEntries(paramsToUse.entries()),
    ...(searchParams !== undefined && !(searchParams instanceof URLSearchParams) ? searchParams : {}),
  };

  // Merge configs - ensure deep merge works with partial config
  const authServer = useAuthServer();
  const mergedConfig = deepMerge({ ...pageConfigDefaults, authServer }, corePagesConfig) as AuthenticationConfig;

  const pages = new Map<string, ReactNode>()
    .set(mergedConfig.identify.path, <User {...mergedConfig.identify.props} />)
    .set(mergedConfig.login.path, <Login {...mergedConfig.login.props} />)
    .set(mergedConfig.register.path, <Register {...mergedConfig.register.props} />)
    .set(mergedConfig.close.path, <Close {...mergedConfig.close.props} />)
    .set(mergedConfig.magic.path, <MagicLink {...mergedConfig.magic.props} />)
    .set(mergedConfig.subscribe.path, <Subscribe searchParams={searchParamsObject} {...mergedConfig.subscribe.props} />)
    .set(mergedConfig.logout.path, <Logout {...mergedConfig.logout.props} />)
    .set(mergedConfig.error.path, <ErrorPage {...mergedConfig.error.props} />);
  for (const [pagePath, page] of Object.entries(additionalPages)) {
    pages.set(pagePath, page);
  }

  // Determine current path from slug
  let path = '/';

  // Safely handle slug arrays, ensuring we don't directly access properties
  // that might be undefined or pending promises
  if ('slug' in params) {
    const slug = params.slug;
    if (Array.isArray(slug) && slug.length > 0) {
      path = `/${slug.join('/')}`;
    }
  }

  // Special handling for register path
  if (path === '/register' || path.endsWith('/register')) {
    path = mergedConfig.register.path;
  }

  // The OAuth close page also serves every sub-path under it (provider callbacks).
  const pageKey = path.startsWith(mergedConfig.close.path) ? mergedConfig.close.path : path;
  if (!pages.has(pageKey)) {
    return notFound();
  }
  return <AuthenticationContext.Provider value={mergedConfig}>{pages.get(pageKey)}</AuthenticationContext.Provider>;
}
