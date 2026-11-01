'use client';
// SPDX-License-Identifier: AGPL-3.0-or-later
import { Button } from '@jgrieve/forms/components/ui/button';
import { type ReactElement, useState } from 'react';
import { LuPlus as Plus, LuUnlink as Unlink } from 'react-icons/lu';
import useSWR from 'swr';
import { useAuthServer } from '../AuthServerContext';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { AuthStaleWriteError } from '../lib/api';
import { oauth2ProviderDisplay } from '../oauth2/OAuthProviders';
import { beginLink, type Identity, identities, type LinkProvider, linkableProviders, unlink } from '../oauth2/link';

const providerDescriptions: ReadonlyMap<string, string> = new Map([
  [
    'google',
    'Connect your Google account to enable AI interactions with Gmail and Google Calendar. This allows agents to read and send emails, manage your calendar events, and help organize your digital life.',
  ],
  [
    'microsoft',
    'Link your Microsoft account to enable AI management of Outlook emails and calendar. Your agents can help schedule meetings, respond to emails, and keep your calendar organized.',
  ],
  [
    'github',
    'Connect to GitHub to enable AI assistance with repository management. Agents can help analyze codebases, create pull requests, review code changes, and manage issues.',
  ],
]);

const DEFAULT_DESCRIPTION = 'Connect this service to enable AI integration.';

/** A provider with the user's identity at it, when they have linked one. */
interface Service {
  provider: LinkProvider;
  identity: Identity | undefined;
}

interface ServiceRowProps {
  service: Service;
  onConnect: (provider: LinkProvider) => void;
  /** A link is being started; connecting again would open a second round trip. */
  connecting: boolean;
  onDisconnect: (service: Service) => void;
}

function ServiceRow({ service, onConnect, onDisconnect, connecting }: ServiceRowProps): ReactElement {
  const { provider, identity } = service;
  const name = provider.friendly_name;
  const account = identity?.email ?? identity?.display_name ?? '';
  return (
    <li className='flex flex-col space-y-4 rounded-lg border p-4'>
      <div className='flex items-center justify-between gap-2'>
        <div className='flex items-center space-x-4'>
          <span aria-hidden>{oauth2ProviderDisplay(provider.provider).icon}</span>
          <div>
            <p className='font-medium'>{name}</p>
            <p className='text-sm text-muted-foreground'>
              {identity === undefined ? 'Not connected' : account === '' ? 'Connected' : `Connected as ${account}`}
            </p>
          </div>
        </div>
        {identity === undefined ? (
          <Button variant='outline' disabled={connecting} onClick={() => onConnect(provider)} className='space-x-1'>
            <Plus className='mr-2 h-4 w-4' aria-hidden />
            Connect<span className='sr-only'> {name}</span>
          </Button>
        ) : (
          <Button variant='outline' size='sm' onClick={() => onDisconnect(service)} className='space-x-1'>
            <Unlink className='mr-2 h-4 w-4' aria-hidden />
            Disconnect<span className='sr-only'> {name}</span>
          </Button>
        )}
      </div>
      <p className='text-sm text-muted-foreground'>{providerDescriptions.get(provider.provider) ?? DEFAULT_DESCRIPTION}</p>
    </li>
  );
}

/**
 * The identity providers the signed-in user can link (oauth_consumer). Connecting leaves for the
 * provider; the auth pages' close route finishes the link when the provider sends the browser back.
 */
export const ConnectedServices = (): ReactElement | null => {
  const authServer = useAuthServer();
  const providers = useSWR<LinkProvider[], Error>([authServer, 'oauth-providers'], async () =>
    linkableProviders(authServer),
  );
  const linked = useSWR<Identity[], Error>([authServer, 'oauth-identities'], async () => identities(authServer));
  const [problem, setProblem] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<Service | null>(null);
  const [connecting, setConnecting] = useState(false);
  const loadError = providers.error ?? linked.error;
  const shownProblem =
    problem ?? (loadError === undefined ? null : `Connected services could not be loaded: ${loadError.message}`);
  const services: Service[] = (providers.data ?? []).map((provider) => ({
    provider,
    identity: (linked.data ?? []).find((identity) => identity.provider === provider.provider),
  }));

  const connect = (provider: LinkProvider): void => {
    setConnecting(true);
    void (async (): Promise<void> => {
      try {
        const authorizeUrl = await beginLink(authServer, provider.name, window.sessionStorage);
        window.location.assign(authorizeUrl);
      } catch (error) {
        setProblem(error instanceof Error ? error.message : `${provider.friendly_name} could not be connected.`);
        setConnecting(false);
      }
    })();
  };

  // An identity that changed since the page loaded (a sign-in with it) is shown as it is now, and
  // the user disconnects it again: nothing is unlinked on a stale view.
  const disconnect = ({ provider, identity }: Service): void => {
    if (identity === undefined) {
      return;
    }
    void (async (): Promise<void> => {
      try {
        await unlink(authServer, identity);
        setDisconnecting(null);
        setProblem(null);
      } catch (error) {
        setDisconnecting(null);
        if (error instanceof AuthStaleWriteError) {
          setProblem(
            `Your ${provider.friendly_name} connection changed since this page loaded. It has been refreshed: disconnect it again to confirm.`,
          );
        } else {
          setProblem(error instanceof Error ? error.message : `${provider.friendly_name} could not be disconnected.`);
        }
      }
      await linked.mutate();
    })();
  };
  const disconnectingName = disconnecting?.provider.friendly_name ?? '';
  // Nothing to connect and nothing connected: the section has nothing to say.
  if (providers.data?.length === 0 && services.length === 0 && shownProblem === null) {
    return null;
  }

  return (
    <>
      {shownProblem !== null && (
        <Alert variant='destructive'>
          <AlertDescription>{shownProblem}</AlertDescription>
        </Alert>
      )}
      <ul aria-label='Connected services' className='grid gap-4'>
        {services.map((service) => (
          <ServiceRow
            key={service.provider.name}
            service={service}
            onConnect={connect}
            onDisconnect={setDisconnecting}
            connecting={connecting}
          />
        ))}
      </ul>
      <Dialog open={disconnecting !== null} onOpenChange={(open) => setDisconnecting(open ? disconnecting : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect {disconnectingName}</DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect your {disconnectingName} account? Your agents will no longer be able to use
              it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setDisconnecting(null)}>
              Cancel
            </Button>
            <Button
              variant='destructive'
              onClick={() => {
                if (disconnecting !== null) {
                  disconnect(disconnecting);
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
