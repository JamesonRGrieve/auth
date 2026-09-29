'use client';
// SPDX-License-Identifier: AGPL-3.0-or-later
import axios from 'axios';
import { getCookie } from 'cookies-next/client';
import { useRouter } from 'next/navigation.js';
import { useEffect, useState } from 'react';

export default function useLoggedIn(): { isLoggedIn: boolean } {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const _router = useRouter();

  useEffect(() => {
    const checkAuth = async (): Promise<void> => {
      try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URI}/v1/user`, {
          headers: {
            Authorization: `Bearer ${getCookie('jwt')}`,
          },
        });
        if (response.status === 200) {
          setIsLoggedIn(true);
        } else {
          setIsLoggedIn(false);
        }
      } catch (error: unknown) {
        console.error('Error checking authentication:', error);
        setIsLoggedIn(false);
      }
    };

    void checkAuth();
  }, []);

  return { isLoggedIn };
}
