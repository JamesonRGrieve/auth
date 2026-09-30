// SPDX-License-Identifier: AGPL-3.0-or-later
import useSWR, { type SWRResponse } from 'swr';
import { z } from 'zod';
import { useAuthServer } from '../AuthServerContext';
import { authRequest } from '../lib/api';

export const PriceSchema = z.object({
  id: z.string(),
  amount: z.number(),
  currency: z.string(),
  interval: z.string(),
  interval_count: z.number(),
  usage_type: z.string(),
});
export type Price = z.infer<typeof PriceSchema>;

export const ProductSchema = z.object({
  name: z.string(),
  description: z.string(),
  prices: z.array(PriceSchema),
  priceAnnual: z.string().optional(),
  marketing_features: z.array(z.object({ name: z.string() })),
  isMostPopular: z.boolean().optional(),
});
export type Product = z.infer<typeof ProductSchema>;

export const PRODUCTS_ENDPOINT = '/v1/products';

/** The plans on sale (GET /v1/products), by name. */
export default function useProducts(): SWRResponse<Product[], Error> {
  const authServer = useAuthServer();
  return useSWR<Product[], Error>([authServer, PRODUCTS_ENDPOINT], async () =>
    authRequest(`${authServer}${PRODUCTS_ENDPOINT}`, z.array(ProductSchema)).then((products) =>
      [...products].sort((a, b) => a.name.localeCompare(b.name)),
    ),
  );
}
