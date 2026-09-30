'use client';
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { ReactNode } from 'react';
import useSWR from 'swr';
import { z } from 'zod';
import { authRequest } from './lib/api';
import { useAuthentication } from './useAuthentication';

export type OrganizationalUnitProps = {
  organizationalUnitEndpoint?: string;
};

const QuotaSchema = z.object({ available: z.number(), used: z.number() });

export const OrganizationalUnitSchema = z.object({
  id: z.number(),
  name: z.string(),
  stripe_id: z.string(),
  enabled: z.boolean(),
  properties: z.record(z.string(), z.unknown()),
  subscriptions: z.array(z.unknown()),
  companies: z.array(z.object({})),
  quotas: z.record(z.string(), QuotaSchema),
});
export type OrganizationalUnit = z.infer<typeof OrganizationalUnitSchema>;
export type Quotas = OrganizationalUnit['quotas'];

function OrganizationalUnitPage({
  searchParams,
  organizationalUnitEndpoint = '/ou',
}: { searchParams: Record<string, string | string[] | undefined> } & OrganizationalUnitProps): ReactNode {
  const authConfig = useAuthentication();
  const ouParam = searchParams['ou'];
  const ouKey = Array.isArray(ouParam) ? ouParam.join(',') : (ouParam ?? '');
  useSWR<OrganizationalUnit[]>([authConfig.authServer, organizationalUnitEndpoint, ouKey], async () =>
    authRequest(`${authConfig.authServer}${organizationalUnitEndpoint}`, z.array(OrganizationalUnitSchema)).then((units) =>
      [...units].sort((a, b) => a.name.localeCompare(b.name)),
    ),
  );
  return null;
}

export default OrganizationalUnitPage;
