'use client';

import assert from '@/components/assert/assert';
import deepMerge from '@/lib/objects';
import { notFound, useSearchParams } from 'next/navigation';
import { ReactNode, useContext } from 'react';
import { AuthenticationContext } from './AuthenticationContext';
import ErrorPage, { ErrorPageProps } from './ErrorPage';
import User, { IdentifyProps } from './Identify';
import Login, { LoginProps } from './Login';
import Logout, { LogoutProps } from './Logout';
import Manage, { ManageProps } from './management';
import Close, { CloseProps } from './oauth2/Close';
import oAuth2Providers from './oauth2/OAuthProviders';
import OrganizationalUnit, { OrganizationalUnitProps } from './OU';
import Register, { RegisterProps } from './Register';
import Subscribe, { SubscribeProps } from './Subscribe';

type RouterPageProps = {
  path: string;
  heading?: string;
};

export type AuthenticationConfig = {
  identify: RouterPageProps & { props?: IdentifyProps };
  login: RouterPageProps & { props?: LoginProps };
  manage: RouterPageProps & { props?: ManageProps };
  register: RouterPageProps & { props?: RegisterProps };
  close: RouterPageProps & { props?: CloseProps };
  subscribe: RouterPageProps & { props?: SubscribeProps };
  logout: RouterPageProps & { props: LogoutProps };
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
  recaptchaSiteKey?: string;
  enableOU: boolean;
};

export const useAuthentication = () => {
  const context = useContext(AuthenticationContext);
  assert(!context.authModes.basic || !context.authModes.magical, 'Basic and Magical modes cannot both be enabled.');
  if (context === undefined) {
    throw new Error('useAuthentication must be used within an AuthenticationProvider');
  }
  return context;
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
    props: undefined,
    heading: '',
  },
  error: {
    path: '/error',
    heading: 'Error',
  },
  appName: process.env.NEXT_PUBLIC_APP_NAME,
  authBaseURI: process.env.NEXT_PUBLIC_AUTH_URI,
  authServer: process.env.NEXT_PUBLIC_API_URI,
  authModes: {
    basic: false,
    oauth2: Object.values(oAuth2Providers).some((provider) => !!provider.client_id),
    magical: process.env.NEXT_PUBLIC_ALLOW_EMAIL_SIGN_IN === 'true',
  },
  recaptchaSiteKey: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
  enableOU: false,
};

// Async function to retrieve search params
async function getSearchParamsAsync() {
  // In a real implementation, you might fetch data based on search params
  // This is just a placeholder to demonstrate the pattern
  return new Promise<Record<string, string>>((resolve) => {
    // Simulating async operation
    setTimeout(() => {
      const searchParams = new URLSearchParams(window.location.search);
      const params: Record<string, string> = {};
      searchParams.forEach((value, key) => {
        params[key] = value;
      });
      resolve(params);
    }, 0);
  });
}

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
}) {
  // Use Next.js 15 hooks for search params if not provided directly
  const routeSearchParams = useSearchParams();

  // Convert searchParams to a regular object
  const searchParamsObject: Record<string, string> = {};

  if (searchParams instanceof URLSearchParams || routeSearchParams) {
    const paramsToUse = searchParams instanceof URLSearchParams ? searchParams : routeSearchParams;
    paramsToUse?.forEach((value, key) => {
      searchParamsObject[key] = value;
    });
  } else if (searchParams && typeof searchParams === 'object') {
    Object.assign(searchParamsObject, searchParams);
  }

  console.log('AuthRouter searchParams:', searchParamsObject);
  console.log('AuthRouter params:', params);

  // Merge configs - ensure deep merge works with partial config
  const mergedConfig = deepMerge(pageConfigDefaults, corePagesConfig || {});

  // Define pages with components
  const pages = {
    [mergedConfig.identify.path]: <User {...mergedConfig.identify.props} />,
    [mergedConfig.login.path]: <Login searchParams={searchParamsObject} {...mergedConfig.login.props} />,
    [mergedConfig.manage.path]: <Manage {...mergedConfig.manage.props} />,
    [mergedConfig.register.path]: <Register searchParams={searchParamsObject} {...mergedConfig.register.props} />,
    [mergedConfig.close.path]: <Close searchParams={searchParamsObject} {...mergedConfig.close.props} />,
    [mergedConfig.subscribe.path]: <Subscribe searchParams={searchParamsObject} {...mergedConfig.subscribe.props} />,
    [mergedConfig.logout.path]: <Logout searchParams={searchParamsObject} {...mergedConfig.logout.props} />,
    ...(mergedConfig.enableOU
      ? { [mergedConfig.ou.path]: <OrganizationalUnit searchParams={searchParamsObject} {...mergedConfig.ou.props} /> }
      : {}),
    [mergedConfig.error.path]: <ErrorPage searchParams={searchParamsObject} {...mergedConfig.error.props} />,
    ...additionalPages,
  };

  // Determine current path from slug
  let path = '/';

  // Safely handle slug arrays, ensuring we don't directly access properties
  // that might be undefined or pending promises
  if (params && 'slug' in params) {
    const slug = params.slug;
    if (Array.isArray(slug) && slug.length > 0) {
      path = `/${slug.join('/')}`;
    } else if (typeof slug === 'string') {
      path = `/${slug}`;
    }
  }

  console.log('Raw path from params:', path);
  console.log('Parsed params:', params);

  // Special handling for register path
  if (path === '/register' || path.endsWith('/register')) {
    path = mergedConfig.register.path;
  }

  console.log('Final path to render:', path);
  console.log('Available paths in router:', Object.keys(pages));

  // Render appropriate component based on path
  if (path in pages || path.startsWith(mergedConfig.close.path)) {
    console.log('Rendering component for path:', path);
    return (
      <AuthenticationContext.Provider value={mergedConfig}>
        {path.startsWith(mergedConfig.close.path) ? pages[mergedConfig.close.path] : pages[path]}
      </AuthenticationContext.Provider>
    );
  } else {
    console.log('Path not found in pages, returning 404. Path:', path);
    console.log('Available paths:', Object.keys(pages));
    return notFound();
  }
}
