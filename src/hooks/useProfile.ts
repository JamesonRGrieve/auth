// SPDX-License-Identifier: AGPL-3.0-or-later
import { useCallback } from 'react';
import useSWR, { type KeyedMutator } from 'swr';
import { z } from 'zod';
import { authRequest } from '../lib/api';
import { type ProfileChanges, type UserProfile, UserProfileResponseSchema } from '../management/profileModel';

export const PROFILE_ENDPOINT = '/v1/user';

const PasswordChangeResponseSchema = z.object({ message: z.string() });

export interface ProfileState {
  profile: UserProfile | undefined;
  error: Error | undefined;
  isLoading: boolean;
  mutate: KeyedMutator<UserProfile>;
  /** PUT only the changed fields; resolves with the saved profile. */
  update: (changes: ProfileChanges) => Promise<UserProfile>;
  /** PATCH the password; resolves with the server's confirmation. */
  changePassword: (currentPassword: string, newPassword: string) => Promise<string>;
}

/** The signed-in user's own profile on `authServer`, with the self-service writes the server allows. */
export function useProfile(authServer: string): ProfileState {
  const url = `${authServer}${PROFILE_ENDPOINT}`;
  const { data, error, isLoading, mutate } = useSWR<UserProfile, Error>(url, async () =>
    authRequest(url, UserProfileResponseSchema).then((response) => response.user),
  );

  const update = useCallback(
    async (changes: ProfileChanges): Promise<UserProfile> => {
      const { user } = await authRequest(url, UserProfileResponseSchema, { method: 'PUT', body: { user: changes } });
      await mutate(user, { revalidate: false });
      return user;
    },
    [url, mutate],
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string): Promise<string> => {
      const { message } = await authRequest(url, PasswordChangeResponseSchema, {
        method: 'PATCH',
        body: { current_password: currentPassword, new_password: newPassword },
      });
      return message;
    },
    [url],
  );

  return { profile: data, error, isLoading, mutate, update, changePassword };
}
