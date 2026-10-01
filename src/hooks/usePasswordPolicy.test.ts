// SPDX-License-Identifier: AGPL-3.0-or-later
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PASSWORD_POLICY_ENDPOINT } from '../lib/passwordPolicy';
import { usePasswordPolicy } from './usePasswordPolicy';

const SERVER = 'https://api.example.com';
const HTTP_OK = 200;
const policy = { min_length: 8, max_bytes: 72, require_letter: true, require_digit: true };

describe('usePasswordPolicy', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads the policy from the auth server’s public endpoint', async () => {
    const fetchMock = vi.fn(async () => Promise.resolve(new Response(JSON.stringify(policy), { status: HTTP_OK })));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => usePasswordPolicy(SERVER));
    await waitFor(() => {
      expect(result.current.data).toEqual(policy);
    });
    expect(fetchMock).toHaveBeenCalledWith(
      `${SERVER}${PASSWORD_POLICY_ENDPOINT}`,
      expect.objectContaining({ method: 'GET' }),
    );
  });
});
