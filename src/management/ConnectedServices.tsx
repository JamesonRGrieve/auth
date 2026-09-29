'use client';
// SPDX-License-Identifier: AGPL-3.0-or-later
import { Button } from '@jgrieve/forms/components/ui/button';
import axios from 'axios';
import { getCookie } from 'cookies-next';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { LuPlus as Plus, LuUnlink as Unlink } from 'react-icons/lu';
import OAuth2Login from 'react-simple-oauth2-login';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import oAuth2Providers, { getOAuth2Provider } from '../oauth2/OAuthProviders';

interface ConnectedService {
  provider: string;
  connected: boolean;
}

const readJwt = (): string => {
  const jwt = getCookie('jwt');
  return typeof jwt === 'string' ? jwt : '';
};

const apiUri = (): string => process.env.NEXT_PUBLIC_API_URI ?? '';
const authUri = (): string => process.env.NEXT_PUBLIC_AUTH_URI ?? '';

const providerDescriptions: Record<string, string> = {
  Google:
    'Connect your Google account to enable AI interactions with Gmail and Google Calendar. This allows agents to read and send emails, manage your calendar events, and help organize your digital life.',
  Microsoft:
    'Link your Microsoft account to enable AI management of Outlook emails and calendar. Your agents can help schedule meetings, respond to emails, and keep your calendar organized.',
  GitHub:
    'Connect to GitHub to enable AI assistance with repository management. Agents can help analyze codebases, create pull requests, review code changes, and manage issues.',
  Tesla:
    'Link your Tesla account to enable AI control of your vehicle. Agents can help manage charging, climate control, and other vehicle settings.',
};

type OAuthErrorLike = {
  response?: { status?: number };
  config?: { url?: string; method?: string; headers?: Record<string, unknown>; data?: Record<string, unknown> };
};

type OAuthSuccessResponse = { code?: string };

export const ConnectedServices = (): ReactNode => {
  const [connectedServices, setConnectedServices] = useState<ConnectedService[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [_loading, setLoading] = useState(true);
  const [disconnectDialog, setDisconnectDialog] = useState<{
    isOpen: boolean;
    provider: string | null;
  }>({
    isOpen: false,
    provider: null,
  });

  const fetchConnections = useCallback(async (): Promise<void> => {
    setLoading(true);
    const baseServices = Object.entries(oAuth2Providers)
      .filter(([, config]) => config.client_id !== undefined && config.client_id !== '')
      .map(([key]) => ({ provider: key, connected: false }));

    setConnectedServices(baseServices);

    try {
      const response = await axios.get<string[]>(`${apiUri()}/v1/oauth2`, {
        headers: {
          Authorization: `Bearer ${readJwt()}`,
        },
      });

      const connectedKeys: string[] = Array.isArray(response.data) ? response.data : [];

      const allServices = baseServices.map((s) => ({
        ...s,
        connected: connectedKeys.includes(s.provider.toLowerCase()),
      }));

      setConnectedServices(allServices);
      setError(null);
    } catch (err: unknown) {
      const e = err as OAuthErrorLike;
      if (e.response?.status === 404) {
        setError(null);
      } else {
        console.error('Error fetching connections:', err);
        setError('Failed to fetch connected services');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchConnections();
  }, [fetchConnections]);

  const handleDisconnect = async (provider: string): Promise<void> => {
    try {
      await axios.delete(`${apiUri()}/v1/oauth2/${provider.toLowerCase()}`, {
        headers: {
          Authorization: `Bearer ${readJwt()}`,
        },
      });
      await fetchConnections();
      setDisconnectDialog({ isOpen: false, provider: null });
    } catch (err: unknown) {
      console.error('Error disconnecting service:', err);
      setError('Failed to disconnect service');
    }
  };

  const onSuccess = async (response: OAuthSuccessResponse): Promise<void> => {
    const provider = disconnectDialog.provider?.toLowerCase() ?? '';
    try {
      if (response.code === undefined || response.code === '') {
        console.error('No code received in OAuth response');
        await fetchConnections();
        return;
      }

      await axios.post(
        `${apiUri()}/v1/oauth2/${provider}`,
        {
          code: response.code,
          referrer: `${authUri()}/close/${provider}`,
        },
        {
          headers: {
            Authorization: `Bearer ${readJwt()}`,
          },
        },
      );
      await fetchConnections();
    } catch (err: unknown) {
      await fetchConnections();
      console.error('OAuth error:', err);
    }
  };

  return (
    <>
      {error !== null && (
        <Alert variant='destructive'>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className='grid gap-4'>
        {connectedServices.map((service) => {
          const provider = getOAuth2Provider(service.provider);
          if (provider === undefined) {
            return null;
          }
          return (
            <div key={service.provider} className='flex flex-col space-y-4 p-4 border rounded-lg'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center space-x-4'>
                  {provider.icon}
                  <div>
                    <p className='font-medium'>{service.provider}</p>
                    <p className='text-sm text-muted-foreground'>{service.connected ? 'Connected' : 'Not connected'}</p>
                  </div>
                </div>

                {service.connected ? (
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() =>
                      setDisconnectDialog({
                        isOpen: true,
                        provider: service.provider,
                      })
                    }
                    className='space-x-1'
                  >
                    <Unlink className='w-4 h-4 mr-2' />
                    Disconnect
                  </Button>
                ) : (
                  <OAuth2Login
                    authorizationUrl={provider.uri}
                    responseType='code'
                    clientId={provider.client_id ?? ''}
                    state={readJwt()}
                    redirectUri={`${authUri()}/close/${service.provider.toLowerCase()}`}
                    scope={provider.scope}
                    onSuccess={(r) => void onSuccess(r as OAuthSuccessResponse)}
                    onFailure={(r) => void onSuccess(r as OAuthSuccessResponse)}
                    isCrossOrigin
                    render={(renderProps) => (
                      <Button variant='outline' onClick={renderProps.onClick} className='space-x-1'>
                        <Plus className='w-4 h-4 mr-2' />
                        Connect
                      </Button>
                    )}
                  />
                )}
              </div>
              <p className='text-sm text-muted-foreground'>
                {providerDescriptions[service.provider] ?? 'Connect this service to enable AI integration.'}
              </p>
            </div>
          );
        })}
      </div>

      <Dialog
        open={disconnectDialog.isOpen}
        onOpenChange={(open) => setDisconnectDialog({ isOpen: open, provider: open ? disconnectDialog.provider : null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect {disconnectDialog.provider}</DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect your {disconnectDialog.provider} account? Your agents will no longer be
              able to interact with {disconnectDialog.provider} services.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setDisconnectDialog({ isOpen: false, provider: null })}>
              Cancel
            </Button>
            <Button
              variant='destructive'
              onClick={() => {
                if (disconnectDialog.provider !== null) {
                  void handleDisconnect(disconnectDialog.provider);
                }
              }}
            >
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
