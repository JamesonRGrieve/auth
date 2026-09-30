'use client';
// SPDX-License-Identifier: AGPL-3.0-or-later
import { useUser } from './useUser';

/** Whether a session is active: the signed-in user loaded. */
export default function useLoggedIn(): { isLoggedIn: boolean } {
  const { data: user } = useUser();
  return { isLoggedIn: user !== null && user !== undefined };
}
