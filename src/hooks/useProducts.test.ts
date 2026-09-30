// SPDX-License-Identifier: AGPL-3.0-or-later
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { withApi } from '../../tests/fixtures/apiWrapper';
import useProducts from './useProducts';

const SERVER = 'https://app.example.com/api';
const HTTP_OK = 200;

const product = (name: string): object => ({
  name,
  description: `${name} plan`,
  prices: [
    { id: `price-${name}`, amount: 900, currency: 'cad', interval: 'month', interval_count: 1, usage_type: 'licensed' },
  ],
  marketing_features: [{ name: 'Support' }],
});

const wrapper = withApi(SERVER);

describe('useProducts', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads the plans on the session cookie, sorted by name', async () => {
    const fetchMock = vi.fn(async () =>
      Promise.resolve(new Response(JSON.stringify([product('Team'), product('Pro')]), { status: HTTP_OK })),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useProducts(), { wrapper });
    await waitFor(() => {
      expect(result.current.data?.map((item) => item.name)).toEqual(['Pro', 'Team']);
    });
    expect(fetchMock).toHaveBeenCalledWith(`${SERVER}/v1/products`, expect.objectContaining({ credentials: 'same-origin' }));
  });

  it('reports an answer that is not a product list', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.resolve(new Response('{"products":[]}', { status: HTTP_OK }))),
    );
    const { result } = renderHook(() => useProducts(), { wrapper });
    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });
  });
});
