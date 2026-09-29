'use client';
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Button } from '@jgrieve/forms/components/ui/button';
import { useRouter } from 'next/navigation.js';
import { type ReactNode, useCallback, useMemo } from 'react';
import OAuth2Login from 'react-simple-oauth2-login';
import log from '../lib/log';
import deepMerge from '../lib/objects';
import providers from './OAuthProviders';

type ProviderConfig = (typeof providers)[keyof typeof providers];
type OAuthProvidersOverride = Partial<Record<string, Partial<ProviderConfig>>>;

export type OAuthProps = {
  overrides?: OAuthProvidersOverride;
};
export default function OAuth({ overrides }: OAuthProps): ReactNode {
  const _router = useRouter();
  const oAuthProviders = useMemo(() => deepMerge(providers, { ...overrides }) as typeof providers, [overrides]);
  log(['OAuth Providers: ', oAuthProviders], { client: 3 });
  const onOAuth2 = useCallback(() => {
    document.location.href = `${process.env.NEXT_PUBLIC_APP_URI}/chat`; // This should be fixed properly just low priority.

    // const redirect = getCookie('href') ?? '/';
    // deleteCookie('href');
    // router.push(redirect);
  }, []);
  /*
  // Eventually automatically launch if it's the only provider.
  useEffect(() => {
    if (Object.values(providers).filter((provider) => provider.client_id).length === 1) {
      
    }
  }, []);
  */
  return (
    <>
      {Object.values(oAuthProviders).some((provider) => provider.client_id !== undefined && provider.client_id !== '') &&
        process.env.NEXT_PUBLIC_ALLOW_EMAIL_SIGN_IN === 'true' && <hr />}
      {Object.entries(oAuthProviders).map(([key, provider]) => {
        return (
          provider.client_id !== undefined &&
          provider.client_id !== '' && (
            <OAuth2Login
              key={key}
              authorizationUrl={provider.uri}
              responseType='code'
              clientId={provider.client_id}
              scope={provider.scope}
              redirectUri={`${process.env.NEXT_PUBLIC_AUTH_URI}/close/${key.replaceAll('.', '-').replaceAll(' ', '-').replaceAll('_', '-').toLowerCase()}`}
              onSuccess={onOAuth2}
              onFailure={onOAuth2}
              extraParams={provider.params}
              isCrossOrigin
              render={(renderProps) => (
                <Button variant='outline' type='button' className='space-x-1 bg-transparent' onClick={renderProps.onClick}>
                  <span className='text-lg'>{provider.icon}</span>
                  <span>Login with {key}</span>
                </Button>
              )}
            />
          )
        );
      })}
    </>
  );
}
