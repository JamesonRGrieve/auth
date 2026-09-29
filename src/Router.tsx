'use client';
// SPDX-License-Identifier: AGPL-3.0-or-later

import { notFound, useSearchParams } from 'next/navigation.js';
import type { ReactNode } from 'react';
import { AuthenticationContext } from './AuthenticationContext';
import ErrorPage, { type ErrorPageProps } from './ErrorPage';
import User, { type IdentifyProps } from './Identify';
import Login, { type LoginProps } from './Login';
import Logout, { type LogoutProps } from './Logout';
import OrganizationalUnit, { type OrganizationalUnitProps } from './OU';
import Register, { type RegisterProps } from './Register';
import Subscribe, { type SubscribeProps } from './Subscribe';
import deepMerge from './lib/objects';
import Manage, { type ManageProps } from './management';
import Close, { type CloseProps } from './oauth2/Close';
import oAuth2Providers from './oauth2/OAuthProviders';

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
  subscribe: RouterPageProps & { props?: SubscribeProps };
  logout: RouterPageProps & { props?: LogoutProps };
  ou: RouterPageProps & { props?: OrganizationalUnitProps };
  error: RouterPageProps & { props?: ErrorPageProps };
  authModes: {
    basic: boolean;
    oauth2: boolean;
    magical: boolean;
  };
  authServer: string;
  appName: string;
  authBaseURI: string;
  recaptchaSiteKey?: string | undefined;
  enableOU: boolean;
};

const pageConfigDefaults: AuthenticationConfig = {
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
  subscribe: {
    path: '/subscribe',
    heading: 'Please Subscribe to Access The Application',
  },
  ou: {
    path: '/ou',
    heading: 'Organizational Unit Management',
  },
  logout: {
    path: '/logout',
    heading: '',
  },
  error: {
    path: '/error',
    heading: 'Error',
  },
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? '',
  authBaseURI: process.env.NEXT_PUBLIC_AUTH_URI ?? '',
  authServer: process.env.NEXT_PUBLIC_API_URI ?? '',
  authModes: {
    basic: true,
    oauth2: Object.values(oAuth2Providers).some((provider) => (provider.client_id ?? '') !== ''),
    magical: false,
  },
  recaptchaSiteKey: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
  enableOU: false,
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
  const mergedConfig = deepMerge(pageConfigDefaults, corePagesConfig) as AuthenticationConfig;

  const pages = new Map<string, ReactNode>()
    .set(mergedConfig.identify.path, <User {...mergedConfig.identify.props} />)
    .set(mergedConfig.login.path, <Login {...mergedConfig.login.props} />)
    .set(mergedConfig.manage.path, <Manage {...mergedConfig.manage.props} />)
    .set(mergedConfig.register.path, <Register {...mergedConfig.register.props} />)
    .set(mergedConfig.close.path, <Close {...mergedConfig.close.props} />)
    .set(mergedConfig.subscribe.path, <Subscribe searchParams={searchParamsObject} {...mergedConfig.subscribe.props} />)
    .set(mergedConfig.logout.path, <Logout {...mergedConfig.logout.props} />)
    .set(mergedConfig.error.path, <ErrorPage {...mergedConfig.error.props} />);
  if (mergedConfig.enableOU) {
    pages.set(mergedConfig.ou.path, <OrganizationalUnit searchParams={searchParamsObject} {...mergedConfig.ou.props} />);
  }
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
