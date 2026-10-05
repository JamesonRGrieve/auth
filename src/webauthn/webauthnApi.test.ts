// SPDX-License-Identifier: AGPL-3.0-or-later
import { afterEach, describe, expect, it, type Mock, vi } from 'vitest';
import { FakeCredential, type FakeBrowser, fakeBrowser } from '../../tests/fixtures/webauthn';
import { AuthApiError } from '../lib/api';
import {
  answerWithSecurityKey,
  ceremonyProblem,
  CreationCeremonySchema,
  createPasskey,
  passkeysSupported,
  signInWithPasskey,
} from './webauthnApi';

const SERVER = 'https://api.example.com';
const HTTP_OK = 200;
const HTTP_UNAUTHORIZED = 401;

const REQUEST_OPTIONS = { challenge: 'Y2hhbGxlbmdl', rpId: 'example.com', userVerification: 'required' };
const CREATION_OPTIONS = {
  challenge: 'Y2hhbGxlbmdl',
  rp: { id: 'example.com', name: 'Example' },
  user: { id: 'dTE', name: 'ada', displayName: 'Ada' },
  pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
  excludeCredentials: [{ id: 'a2V5', type: 'public-key', transports: ['internal'] }],
  extensions: { credProps: true },
};
const ASSERTION = { id: 'a2V5', rawId: 'a2V5', type: 'public-key' };

type FetchMock = Mock<(url: string, init: RequestInit) => Promise<Response>>;

/** The server answering each call in turn with `bodies`, recording what was sent. */
function server(...bodies: { status: number; body: object }[]): FetchMock {
  const fetchMock: FetchMock = vi.fn();
  for (const { status, body } of bodies) {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }));
  }
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** The body the `call`th request sent. */
const sentBody = (fetchMock: FetchMock, call: number): BodyInit | null | undefined =>
  fetchMock.mock.calls.at(call)?.[1].body;

describe('the WebAuthn ceremonies', () => {
  let browser: FakeBrowser | null = null;

  afterEach(() => {
    browser?.restore();
    browser = null;
    vi.unstubAllGlobals();
  });

  it('knows a browser that can run them from one that can’t', () => {
    expect(passkeysSupported()).toBe(false);
    browser = fakeBrowser(new FakeCredential(ASSERTION));
    expect(passkeysSupported()).toBe(true);
  });

  it('signs in with a passkey: options for the account named, the browser’s assertion, then the session', async () => {
    browser = fakeBrowser(new FakeCredential(ASSERTION));
    const fetchMock = server(
      { status: HTTP_OK, body: { ceremony_id: 'c1', public_key: REQUEST_OPTIONS, expires_at: '2026-10-05T10:00:00Z' } },
      { status: HTTP_OK, body: { token: 'jwt', user: {}, preferences: {}, teams: [], session_key: 'k' } },
    );
    await signInWithPasskey(SERVER, 'ada@example.com');
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      `${SERVER}/v1/webauthn/authenticate/options`,
      `${SERVER}/v1/webauthn/authenticate/verify`,
    ]);
    expect(sentBody(fetchMock, 0)).toBe(JSON.stringify({ email: 'ada@example.com' }));
    expect(browser.get).toHaveBeenCalledWith({ publicKey: REQUEST_OPTIONS });
    expect(sentBody(fetchMock, 1)).toBe(JSON.stringify({ ceremony_id: 'c1', credential: ASSERTION }));
  });

  it('signs in with whichever passkey the browser offers when no account is named', async () => {
    browser = fakeBrowser(new FakeCredential(ASSERTION));
    const fetchMock = server(
      { status: HTTP_OK, body: { ceremony_id: 'c1', public_key: REQUEST_OPTIONS } },
      { status: HTTP_OK, body: { token: 'jwt' } },
    );
    await signInWithPasskey(SERVER, null);
    expect(sentBody(fetchMock, 0)).toBe('{}');
  });

  it('answers a second-factor challenge with a security key, naming the challenge both ways', async () => {
    browser = fakeBrowser(new FakeCredential(ASSERTION));
    const fetchMock = server(
      { status: HTTP_OK, body: { ceremony_id: 'c2', public_key: REQUEST_OPTIONS } },
      { status: HTTP_OK, body: { token: 'jwt' } },
    );
    await answerWithSecurityKey(SERVER, 'challenge-token');
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      `${SERVER}/v1/webauthn/mfa/options`,
      `${SERVER}/v1/webauthn/mfa/verify`,
    ]);
    expect(sentBody(fetchMock, 0)).toBe(JSON.stringify({ challenge_token: 'challenge-token' }));
    expect(sentBody(fetchMock, 1)).toBe(
      JSON.stringify({ ceremony_id: 'c2', challenge_token: 'challenge-token', credential: ASSERTION }),
    );
  });

  it('makes a passkey from the server’s creation options', async () => {
    const made = { id: 'bmV3', rawId: 'bmV3', type: 'public-key' };
    browser = fakeBrowser(new FakeCredential(made));
    const opened = CreationCeremonySchema.parse({ ceremony_id: 'c3', public_key: CREATION_OPTIONS });
    await expect(createPasskey(opened.public_key)).resolves.toEqual(made);
    expect(browser.create).toHaveBeenCalledWith({ publicKey: CREATION_OPTIONS });
  });

  it('fails when the browser gives no passkey', async () => {
    browser = fakeBrowser(new FakeCredential(ASSERTION));
    browser.get.mockResolvedValueOnce(null);
    server({ status: HTTP_OK, body: { ceremony_id: 'c1', public_key: REQUEST_OPTIONS } });
    await expect(signInWithPasskey(SERVER, null)).rejects.toThrow('The browser gave no passkey.');
  });

  it('says why a ceremony ended: cancelled, already registered, refused by the server, or otherwise', () => {
    expect(ceremonyProblem(new DOMException('', 'NotAllowedError'))).toBe('The request was cancelled, or it timed out.');
    expect(ceremonyProblem(new DOMException('', 'InvalidStateError'))).toBe(
      'This passkey or security key is already registered.',
    );
    expect(ceremonyProblem(new AuthApiError(HTTP_UNAUTHORIZED, 'Unknown, expired or already used WebAuthn ceremony'))).toBe(
      'Unknown, expired or already used WebAuthn ceremony',
    );
    expect(ceremonyProblem(new Error('Offline'))).toBe('Offline');
  });
});
