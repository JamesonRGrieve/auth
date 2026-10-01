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
import Manage, { type ManageProps } from './management';
import Close, { type CloseProps } from './oauth2/Close';
import PairApprove, { type PairApproveProps } from './pairing/PairApprove';
import PairRequest, { type PairRequestProps } from './pairing/PairRequest';

export { useAuthentication } from './useAuthentication';

type RouterPageProps = {
  path: string;
  heading?: string | undefined;
};

export type AuthenticationConfig = {
  identify: RouterPageProps & { props?: IdentifyProps };
  login: RouterPageProps & { props?: LoginProps };
  manage: RouterPageProps & { props?: ManageProps };
  register: RouterPageProps & { props?: RegisterProps };
  close: RouterPageProps & { props?: CloseProps };
  /** Where sign-in links land; point the server's MAGIC_LINK_BASE_URL at `<app><authPath><path>`. */
  magic: RouterPageProps & { props?: MagicLinkProps };
  /** Where a pairing QR code lands; point the server's PAIRING_BASE_URL at `<app><authPath>/pair`. */
  pair: RouterPageProps & { props?: PairApproveProps };
  /** Where a signed-out device asks to be signed in by one that is (it shows the pairing code). */
  pairRequest: RouterPageProps & { props?: PairRequestProps };
  subscribe: RouterPageProps & { props?: SubscribeProps };
  logout: RouterPageProps & { props?: LogoutProps };
  error: RouterPageProps & { props?: ErrorPageProps };
  authModes: {
    basic: boolean;
    magical: boolean;
    /** Offer signing in by scanning a code with another, signed-in device (auth_device_pairing). */
    pairing?: boolean | undefined;
  };
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
  pair: {
    path: '/pair/approve',
    heading: '',
  },
  pairRequest: {
    path: '/pair',
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
    .set(mergedConfig.manage.path, <Manage {...mergedConfig.manage.props} />)
    .set(mergedConfig.register.path, <Register {...mergedConfig.register.props} />)
    .set(mergedConfig.close.path, <Close {...mergedConfig.close.props} />)
    .set(mergedConfig.magic.path, <MagicLink {...mergedConfig.magic.props} />)
    .set(mergedConfig.pair.path, <PairApprove {...mergedConfig.pair.props} />)
    .set(mergedConfig.pairRequest.path, <PairRequest {...mergedConfig.pairRequest.props} />)
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
