// SPDX-License-Identifier: AGPL-3.0-or-later
import { afterEach, describe, expect, it, vi } from 'vitest';
import { answerPairing } from './pairingApi';

const SERVER = 'https://app.example.com/api';
const HTTP_OK = 200;

describe('answerPairing', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts the decision with the token on the session cookie', async () => {
    const fetchMock = vi.fn(async () =>
      Promise.resolve(new Response('{"pairing_id":"p1","state":"approved","user_id":"u1"}', { status: HTTP_OK })),
    );
    vi.stubGlobal('fetch', fetchMock);
    await expect(answerPairing(SERVER, 'pair-1', 'approve')).resolves.toEqual({ pairing_id: 'p1', state: 'approved' });
    expect(fetchMock).toHaveBeenCalledWith(
      `${SERVER}/v1/auth/pairing/approve`,
      expect.objectContaining({ method: 'POST', credentials: 'same-origin', body: '{"token":"pair-1"}' }),
    );
  });

  it('rejects an answer in an unexpected state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.resolve(new Response('{"pairing_id":"p1","state":"pending"}', { status: HTTP_OK }))),
    );
    await expect(answerPairing(SERVER, 'pair-1', 'deny')).rejects.toThrow();
  });
});
