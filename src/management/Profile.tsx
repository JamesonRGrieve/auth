'use client';
// SPDX-License-Identifier: AGPL-3.0-or-later

import DynamicForm, { type DynamicFormFieldValueTypes } from '@jgrieve/forms/DynamicForm';
import { Button } from '@jgrieve/forms/components/ui/button';
import { Separator } from '@jgrieve/forms/components/ui/separator';
import { toast as toastUntyped } from '@jgrieve/forms/hooks/useToast';
import { DropdownMenu, DropdownMenuTrigger } from '@radix-ui/react-dropdown-menu';
import { ArrowTopRightIcon } from '@radix-ui/react-icons';
import axios from 'axios';
import { deleteCookie, getCookie } from 'cookies-next';
import { type ReactElement, useCallback, useEffect, useMemo } from 'react';
import { mutate } from 'swr';
import type { AuthenticationConfig } from '../Router';
import { DataTable } from '../components/data/data-table';
import { DataTableColumnHeader } from '../components/data/data-table-column-header';
import type { DataTableCellContext, DataTableColumn, DataTableColumnDef } from '../components/data/features';
import { useTeams } from '../hooks/useTeam';
import log from '../lib/log';
import VerifySMS from '../mfa/SMS';
import { InvitationsTable } from './Invitations';

const toast = toastUntyped as (args: { title: string; description: string; variant?: string }) => void;

const readJwtString = (): string => {
  const jwt = getCookie('jwt');
  return typeof jwt === 'string' ? jwt : '';
};

type DynamicFormFieldType = 'text' | 'number' | 'password' | 'boolean';
const FIELD_TYPES: readonly DynamicFormFieldType[] = ['text', 'number', 'password', 'boolean'];
const isFieldType = (raw: string): raw is DynamicFormFieldType => (FIELD_TYPES as readonly string[]).includes(raw);
/** Narrow an untyped server-provided field type to the DynamicForm field union, defaulting to `text`. */
const toFieldType = (raw: string): DynamicFormFieldType => (isFieldType(raw) ? raw : 'text');

type Team = {
  image_url: string | null;
  name: string;
  parent_id: string | null;
  parent: string | null;
  children: unknown[];
  updated_at: string;
  updated_by_user_id: string | null;
  id: string;
  created_at: string;
  created_by_user_id: string;
  description: string | null;
  encryption_key: string;
  token: string | null;
  training_data: string | null;
};

type MissingRequirements = Record<string, unknown> | Array<Record<string, unknown>>;
type ProfileUserData = {
  user?: Record<string, unknown> & { id?: string };
  missing_requirements?: MissingRequirements;
} & Record<string, unknown>;

type ProfileRouter = { push: (path: string) => void };

const TeamNameHeader = ({ column }: { column: DataTableColumn<Team> }): ReactElement => (
  <DataTableColumnHeader column={column} title='Team' />
);
const TeamNameCell = ({ row }: DataTableCellContext<Team>): ReactElement => (
  <div className='flex space-x-2'>
    <span className='max-w-[500px] truncate font-medium'>{row.getValue('name')}</span>
  </div>
);
const TeamRoleHeader = ({ column }: { column: DataTableColumn<Team> }): ReactElement => (
  <DataTableColumnHeader column={column} title='Role' />
);
const TeamRoleCell = ({ row }: DataTableCellContext<Team>): ReactElement => (
  <div className='flex w-[100px] items-center'>
    <span>{row.getValue('role')}</span>
  </div>
);
const TeamActionHeader = ({ column }: { column: DataTableColumn<Team> }): ReactElement => (
  <DataTableColumnHeader column={column} title='Action' />
);

export const Profile = ({
  isLoading,
  error,
  data,
  router,
  authConfig,
  userDataSWRKey,
  responseMessage,
  userUpdateEndpoint,
  setResponseMessage,
}: {
  isLoading: boolean;
  error: Error | undefined;
  data: ProfileUserData | undefined;
  router: ProfileRouter;
  authConfig: AuthenticationConfig;
  userDataSWRKey: string;
  responseMessage: string;
  userUpdateEndpoint: string;
  setResponseMessage: (message: string) => void;
}): React.JSX.Element => {
  const { data: userTeams } = useTeams();
  // Use `data` passed from parent Manage component as the authoritative user object.
  // But be resilient to different API shapes. Try several common locations for fields.
  const readUserField = useCallback(
    (field: string): DynamicFormFieldValueTypes | undefined => {
      // Try several common keys and shapes to be resilient to API variations.
      const candidates: string[] = [];
      const camel = field.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
      candidates.push(field, camel, field.replace(/_/g, ''), field.replace('_name', ''), 'name');
      // Common identity keys
      if (field === 'first_name') {
        candidates.push('given_name', 'givenName');
      }
      if (field === 'last_name') {
        candidates.push('family_name', 'familyName');
      }
      if (field === 'display_name') {
        candidates.push('displayName', 'username', 'userName');
      }

      try {
        const root = data;
        const user = root?.user;
        const userUser = user?.['user'] as Record<string, unknown> | undefined;
        const userProfile = user?.['profile'] as Record<string, unknown> | undefined;
        for (const key of candidates) {
          if (user?.[key] !== undefined) {
            return user[key] as DynamicFormFieldValueTypes;
          }
          if (root?.[key] !== undefined) {
            return root[key] as DynamicFormFieldValueTypes;
          }
          if (userUser?.[key] !== undefined) {
            return userUser[key] as DynamicFormFieldValueTypes;
          }
          if (userProfile?.[key] !== undefined) {
            return userProfile[key] as DynamicFormFieldValueTypes;
          }
        }
      } catch {
        // ignore
      }
      return undefined;
    },
    [data],
  );

  // Build the DynamicForm `toUpdate` record from the user object, keeping only
  // values that are valid form-field values (string / number / boolean). This
  // narrows the GQL User shape to the form's value union without casting.
  const toUpdateData = useMemo<Record<string, DynamicFormFieldValueTypes> | undefined>(() => {
    const user = data?.user;
    if (user === undefined) {
      return undefined;
    }
    const result: Record<string, DynamicFormFieldValueTypes> = {};
    for (const [key, value] of Object.entries(user)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        result[key] = value;
      }
    }
    return result;
  }, [data]);

  // Debug: (removed runtime console output) - kept comment for dev reference

  // If the user has no timezone set on the server, detect the browser timezone and
  // persist it automatically on first sign-in so the UI and subsequent logins show
  // the correct timezone. Do NOT overwrite an existing timezone.
  useEffect(() => {
    try {
      if (typeof window === 'undefined') {
        return;
      }
      if (data === undefined) {
        return;
      }
      const existingTZ = readUserField('timezone');
      if (typeof existingTZ === 'string' && existingTZ.length > 0) {
        return;
      }

      const detectedTZ =
        typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function'
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : 'UTC';

      void (async () => {
        try {
          await axios.put(
            `${authConfig.authServer}${userUpdateEndpoint}`,
            { user: { timezone: detectedTZ } },
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${readJwtString()}`,
              },
            },
          );
          await mutate(userDataSWRKey);
          await mutate('/user');
        } catch {
          // failed to persist timezone; swallow silently
        }
      })();
    } catch {
      // swallow errors
    }
  }, [data, authConfig, userUpdateEndpoint, userDataSWRKey, readUserField]);

  const userTeamsColumns: DataTableColumnDef<Team>[] = useMemo(() => {
    // eslint-disable-next-line react/no-unstable-nested-components -- closes over router; memoized via useMemo
    const TeamActionCell = ({ row }: DataTableCellContext<Team>): ReactElement => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' className='flex h-8 w-8 p-0' onClick={() => router.push(`/team/${row.original.id}`)}>
            <ArrowTopRightIcon />
          </Button>
        </DropdownMenuTrigger>
      </DropdownMenu>
    );
    return [
      {
        accessorKey: 'name',
        header: TeamNameHeader,
        cell: TeamNameCell,
        meta: { headerName: 'team' },
      },
      {
        accessorKey: 'role',
        header: TeamRoleHeader,
        cell: TeamRoleCell,
        filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
        meta: { headerName: 'role' },
      },
      {
        id: 'actions',
        header: TeamActionHeader,
        cell: TeamActionCell,
        enableHiding: true,
        enableSorting: false,
        meta: { headerName: 'Actions' },
      },
    ];
  }, [router]);

  return (
    <div>
      <div>
        <h3 className='text-lg font-medium'>Profile</h3>
        <p className='text-sm text-muted-foreground'>Apply basic changes to your profile</p>
      </div>
      <Separator className='my-4' />
      {isLoading ? (
        <p>Loading Current Data...</p>
      ) : error !== undefined ? (
        <p>{error.message}</p>
      ) : data?.missing_requirements === undefined || Object.keys(data.missing_requirements).length === 0 ? (
        <DynamicForm
          fields={{
            first_name: {
              type: 'text',
              display: 'First Name',
              validation: (value) => typeof value === 'string' && value.length > 0,
              value: readUserField('first_name') ?? '',
            },
            last_name: {
              type: 'text',
              display: 'Last Name',
              validation: (value) => typeof value === 'string' && value.length > 0,
              value: readUserField('last_name') ?? '',
            },
            display_name: {
              type: 'text',
              display: 'Display Name',
              validation: (value) => typeof value === 'string' && value.length > 0,
              // Prefer explicit display_name, otherwise compose from first+last if available
              value: (() => {
                const displayName = readUserField('display_name');
                if (displayName !== undefined) {
                  return displayName;
                }
                const first = readUserField('first_name');
                const last = readUserField('last_name');
                const firstStr = typeof first === 'string' ? first : '';
                const lastStr = typeof last === 'string' ? last : '';
                if (firstStr !== '' || lastStr !== '') {
                  return `${firstStr} ${lastStr}`.trim();
                }
                return '';
              })(),
            },
            timezone: {
              type: 'text',
              display: 'Timezone',
              validation: (value) => typeof value === 'string' && value.length > 0,
              // Use server value if present; otherwise fall back to browser timezone or UTC.
              value: (() => {
                const tz = readUserField('timezone');
                if (typeof tz === 'string' && tz.length > 0) {
                  return tz;
                }
                return typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function'
                  ? Intl.DateTimeFormat().resolvedOptions().timeZone
                  : 'UTC';
              })(),
            },
          }}
          toUpdate={toUpdateData}
          submitButtonText='Update'
          excludeFields={[
            'id',
            'agent_id',
            'missing_requirements',
            'email',
            'subscription',
            'stripe_id',
            'ip_address',
            'companies',
          ]}
          readOnlyFields={['input_tokens', 'output_tokens']}
          additionalButtons={[
            <div key='teams-table' className='col-span-4'>
              <DataTable
                data={(userTeams as Team[] | undefined) ?? []}
                columns={userTeamsColumns}
                meta={{ title: 'Teams' }}
              />
            </div>,
          ]}
          onConfirm={(formData: Record<string, unknown>) => {
            void (async (): Promise<void> => {
              try {
                const putResponse = await axios
                  .put<{ detail?: string }>(
                    `${authConfig.authServer}${userUpdateEndpoint}`,
                    {
                      user: {
                        ...Object.entries(formData).reduce<Record<string, unknown>>((acc, [key, value]) => {
                          if (value !== undefined && value !== null && value !== '') {
                            acc[key] = value;
                          }
                          return acc;
                        }, {}),
                      },
                    },
                    {
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${readJwtString()}`,
                      },
                    },
                  )
                  .catch((exception: { response?: { data?: { detail?: string } } }) => ({
                    data: exception.response?.data ?? {},
                  }));
                const updateResponse = putResponse.data;
                log(['Update Response', updateResponse], { client: 2 });
                setResponseMessage(updateResponse.detail ?? 'Update successful.');
                await mutate('/user');
                toast({
                  title: 'Profile updated',
                  description: 'Your profile was updated successfully.',
                });
              } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'There was an error updating your profile.';
                toast({
                  title: 'Profile update failed',
                  description: message,
                  variant: 'destructive',
                });
              }
            })();
          }}
        />
      ) : (
        <>
          {(() => {
            const reqs = data.missing_requirements;
            const reqsArray = Array.isArray(reqs) ? reqs : [];
            const reqsRecord = Array.isArray(reqs) ? {} : reqs;
            const hasVerifyEmail = reqsArray.some((obj) => Object.keys(obj).some((key) => key === 'verify_email'));
            const verifySms = reqsRecord['verify_sms'];
            const hasOther = reqsArray.some((obj) =>
              Object.keys(obj).some((key) => !['verify_email', 'verify_sms'].includes(key)),
            );
            return (
              <>
                {hasVerifyEmail && <p className='text-xl'>Please check your email and verify it using the link provided.</p>}
                {verifySms !== undefined && verifySms !== null && verifySms !== false && (
                  <VerifySMS
                    verifiedCallback={() => {
                      void mutate(userDataSWRKey);
                    }}
                  />
                )}
                {hasOther && (
                  <DynamicForm
                    submitButtonText='Submit Missing Information'
                    fields={Object.entries(reqsRecord).reduce<Record<string, { type: DynamicFormFieldType }>>(
                      (acc, [, value]) => {
                        const v = value as Record<string, unknown>;
                        const fieldKey = Object.keys(v)[0] ?? '';
                        const rawType = Object.values(v)[0];
                        acc[fieldKey] = { type: typeof rawType === 'string' ? toFieldType(rawType) : 'text' };
                        return acc;
                      },
                      {},
                    )}
                    excludeFields={['verify_email', 'verify_sms']}
                    onConfirm={(formData: Record<string, unknown>) => {
                      void (async (): Promise<void> => {
                        const putResponse = await axios
                          .put<{ detail?: string }>(
                            `${authConfig.authServer}${userUpdateEndpoint}`,
                            {
                              ...formData,
                            },
                            {
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${readJwtString()}`,
                              },
                            },
                          )
                          .catch((exception: { response?: { data?: { detail?: string } } }) => ({
                            data: exception.response?.data ?? {},
                          }));
                        const updateResponse = putResponse.data;
                        if (updateResponse.detail !== undefined) {
                          setResponseMessage(updateResponse.detail);
                        }
                        await mutate(userDataSWRKey);
                        const newReqs = (formData as { missing_requirements?: Record<string, unknown> })
                          .missing_requirements;
                        if (newReqs !== undefined && Object.keys(newReqs).length === 0) {
                          const redirect = (getCookie('href') as string | undefined) ?? '/';
                          void deleteCookie('href');
                          router.push(redirect);
                        }
                      })();
                    }}
                  />
                )}
              </>
            );
          })()}
          {responseMessage !== '' && <p>{responseMessage}</p>}
        </>
      )}
      <div className='pb-4' />
      {data?.user?.id !== undefined && <InvitationsTable userId={data.user.id} />}
    </div>
  );
};
