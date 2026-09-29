'use client';
// SPDX-License-Identifier: AGPL-3.0-or-later

import { usePathname as useNextPathname } from 'next/navigation.js';
import { useEffect, useState } from 'react';

export default function usePathname(): string {
  const pathname = useNextPathname();
  const [currentPathname, setCurrentPathname] = useState(pathname);

  useEffect(() => {
    setCurrentPathname(pathname);
  }, [pathname]);

  return currentPathname;
}
