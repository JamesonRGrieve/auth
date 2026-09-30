'use client';
// SPDX-License-Identifier: AGPL-3.0-or-later
import { Button } from '@jgrieve/forms/components/ui/button';
import { type ReactElement, useState } from 'react';
import { LuPlus as Plus, LuUnlink as Unlink } from 'react-icons/lu';
import useSWR from 'swr';
import { useAuthServer } from '../AuthServerContext';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { oauth2ProviderDisplay } from '../oauth2/OAuthProviders';
import { beginLink, type Connection, connections, linkableProviders, unlink } from '../oauth2/link';

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

const label = (provider: string): string => oauth2ProviderDisplay(provider).label;

interface ServiceRowProps {
  provider: string;
  connection: Connection | undefined;
  onConnect: (provider: string) => void;
  onDisconnect: (provider: string) => void;
}

function ServiceRow({ provider, connection, onConnect, onDisconnect }: ServiceRowProps): ReactElement {
  const name = label(provider);
  const account = connection?.account_email ?? connection?.account_name ?? '';
  return (
    <li className='flex flex-col space-y-4 rounded-lg border p-4'>
      <div className='flex items-center justify-between gap-2'>
        <div className='flex items-center space-x-4'>
          <span aria-hidden>{oauth2ProviderDisplay(provider).icon}</span>
          <div>
            <p className='font-medium'>{name}</p>
            <p className='text-sm text-muted-foreground'>
              {connection === undefined ? 'Not connected' : account === '' ? 'Connected' : `Connected as ${account}`}
            </p>
          </div>
        </div>
        {connection === undefined ? (
          <Button variant='outline' onClick={() => onConnect(provider)} className='space-x-1'>
            <Plus className='mr-2 h-4 w-4' aria-hidden />
            Connect<span className='sr-only'> {name}</span>
          </Button>
        ) : (
          <Button variant='outline' size='sm' onClick={() => onDisconnect(provider)} className='space-x-1'>
            <Unlink className='mr-2 h-4 w-4' aria-hidden />
            Disconnect<span className='sr-only'> {name}</span>
          </Button>
        )}
      </div>
      <p className='text-sm text-muted-foreground'>{providerDescriptions.get(provider) ?? DEFAULT_DESCRIPTION}</p>
    </li>
  );
}

/**
 * The external accounts the signed-in user can link (auth_oauth2_client). Connecting leaves for the
 * provider; the auth pages' close route finishes the link when the provider sends the browser back.
 */
export const ConnectedServices = (): ReactElement => {
  const authServer = useAuthServer();
  const providers = useSWR<string[], Error>([authServer, 'oauth2-providers'], async () => linkableProviders(authServer));
  const linked = useSWR<Connection[], Error>([authServer, 'oauth2-connections'], async () => connections(authServer));
  const [problem, setProblem] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const loadError = providers.error ?? linked.error;
  const shownProblem =
    problem ?? (loadError === undefined ? null : `Connected services could not be loaded: ${loadError.message}`);

  const connect = (provider: string): void => {
    void (async (): Promise<void> => {
      try {
        const authorizeUrl = await beginLink(authServer, provider, window.sessionStorage);
        window.location.assign(authorizeUrl);
      } catch (error) {
        setProblem(error instanceof Error ? error.message : `${label(provider)} could not be connected.`);
      }
    })();
  };

  const disconnect = (provider: string): void => {
    void (async (): Promise<void> => {
      try {
        await unlink(authServer, provider);
        setDisconnecting(null);
        await linked.mutate();
      } catch (error) {
        setProblem(error instanceof Error ? error.message : `${label(provider)} could not be disconnected.`);
      }
    })();
  };

  return (
    <>
      {shownProblem !== null && (
        <Alert variant='destructive'>
          <AlertDescription>{shownProblem}</AlertDescription>
        </Alert>
      )}
      {providers.data?.length === 0 && (
        <p className='text-sm text-muted-foreground'>No services are available to connect.</p>
      )}
      <ul aria-label='Connected services' className='grid gap-4'>
        {(providers.data ?? []).map((provider) => (
          <ServiceRow
            key={provider}
            provider={provider}
            connection={(linked.data ?? []).find((connection) => connection.provider === provider)}
            onConnect={connect}
            onDisconnect={setDisconnecting}
          />
        ))}
      </ul>
      <Dialog open={disconnecting !== null} onOpenChange={(open) => setDisconnecting(open ? disconnecting : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect {label(disconnecting ?? '')}</DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect your {label(disconnecting ?? '')} account? Your agents will no longer be
              able to use it.
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
