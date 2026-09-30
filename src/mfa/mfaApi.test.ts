// SPDX-License-Identifier: AGPL-3.0-or-later
import { afterEach, describe, expect, it, type Mock, vi } from 'vitest';
import {
  answerMfaChallenge,
  completeMfaLogin,
  isMfaChallenge,
  mfaApi,
  passwordLogin,
  requestMagicLink,
  verifyMagicLink,
} from './mfaApi';

const SERVER = 'https://api.example.com';
const HTTP_OK = 200;
const HTTP_NO_CONTENT = 204;
const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;

const method = { id: 'm1', method_type: 'totp', is_enabled: true, is_primary: false, verification: false };

const answer = (body: object | null): Mock<(url: string, init: RequestInit) => Promise<Response>> => {
  const fetchMock = vi.fn(async () =>
    Promise.resolve(
      body === null
        ? new Response(null, { status: HTTP_NO_CONTENT })
        : new Response(JSON.stringify(body), { status: HTTP_OK }),
    ),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

const sent = (
  fetchMock: Mock<(url: string, init: RequestInit) => Promise<Response>>,
): [string, string | undefined, unknown] => {
  const [url, init] = fetchMock.mock.calls[0] ?? ['', {}];
  return [url, init.method, init.body];
};

describe('mfaApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists methods from the multifactor_methods envelope', async () => {
    answer({ multifactor_methods: [method] });
    await expect(mfaApi.list(SERVER)).resolves.toEqual([method]);
  });

  it('creates a TOTP method wrapped as multifactor_method', async () => {
    const fetchMock = answer({ multifactor_method: method });
    await expect(mfaApi.createTotp(SERVER)).resolves.toEqual(method);
    expect(sent(fetchMock)).toEqual([`${SERVER}/v1/user/mfa`, 'POST', '{"multifactor_method":{"method_type":"totp"}}']);
  });

  it('reads the provisioning URI and key for an unverified method', async () => {
    const fetchMock = answer({ provisioning_uri: 'otpauth://totp/App:a?secret=ABC', secret: 'ABC' });
    await expect(mfaApi.provisioning(SERVER, 'm1')).resolves.toEqual({
      provisioning_uri: 'otpauth://totp/App:a?secret=ABC',
      secret: 'ABC',
    });
    expect(sent(fetchMock)).toEqual([`${SERVER}/v1/user/mfa/m1/totp/provisioning`, 'GET', undefined]);
  });

  it('verifies a code and reports whether it matched', async () => {
    const fetchMock = answer({ verified: false });
    await expect(mfaApi.verify(SERVER, 'm1', '123456')).resolves.toBe(false);
    expect(sent(fetchMock)).toEqual([`${SERVER}/v1/user/mfa/m1/verify`, 'POST', '{"code":"123456"}']);
  });

  it('returns freshly generated recovery codes', async () => {
    const fetchMock = answer(['AAAAA-BBBBB', 'CCCCC-DDDDD']);
    await expect(mfaApi.generateRecoveryCodes(SERVER, 'm1', 2)).resolves.toEqual(['AAAAA-BBBBB', 'CCCCC-DDDDD']);
    expect(sent(fetchMock)).toEqual([`${SERVER}/v1/user/mfa/m1/recovery/generate`, 'POST', '{"count":2}']);
  });

  it('turns off or removes a method, with the code when one is given', async () => {
    const disable = answer({ disabled: true });
    await mfaApi.disable(SERVER, 'm1', '654321');
    expect(sent(disable)).toEqual([`${SERVER}/v1/user/mfa/m1/disable`, 'POST', '{"code":"654321"}']);
    const remove = answer(null);
    await mfaApi.remove(SERVER, 'm1');
    expect(sent(remove)).toEqual([`${SERVER}/v1/user/mfa/m1/delete`, 'POST', '{}']);
  });
});

describe('two-step login', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends Basic credentials and recognises a challenge', async () => {
    const fetchMock = answer({ mfa_required: true, challenge_token: 'c1', methods: [{ id: 'm1', method_type: 'totp' }] });
    const result = await passwordLogin(SERVER, 'ada@example.com', 'pässword');
    expect(isMfaChallenge(result)).toBe(true);
    const [, init] = fetchMock.mock.calls[0] ?? ['', {}];
    expect(init.headers).toEqual({
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from('ada@example.com:pässword', 'utf-8').toString('base64')}`,
    });
  });

  it('recognises a plain session', async () => {
    answer({ token: 'jwt-1', user: { id: 'u1' } });
    const result = await passwordLogin(SERVER, 'ada@example.com', 'pw');
    expect(isMfaChallenge(result)).toBe(false);
    expect(result).toEqual({ token: 'jwt-1' });
  });

  it('trades the challenge and a trimmed code for a session', async () => {
    const fetchMock = answer({ token: 'jwt-2' });
    await expect(completeMfaLogin(SERVER, 'c1', ' abcde-fghij ')).resolves.toEqual({ token: 'jwt-2' });
    expect(sent(fetchMock)).toEqual([
      `${SERVER}/v1/user/authorize/mfa`,
      'POST',
      '{"challenge_token":"c1","code":"abcde-fghij"}',
    ]);
  });
});

describe('answerMfaChallenge', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is null once signed in', async () => {
    answer({ token: 'jwt-2' });
    await expect(answerMfaChallenge(SERVER, 'c1', '123456')).resolves.toBeNull();
  });

  it('explains a wrong code, and any other refusal', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.resolve(new Response('{"detail":"Invalid MFA code"}', { status: HTTP_UNAUTHORIZED }))),
    );
    await expect(answerMfaChallenge(SERVER, 'c1', '000000')).resolves.toBe(
      'Invalid MFA code. Try the current code, or start over if it keeps failing.',
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.resolve(new Response('{"detail":"Challenge expired"}', { status: HTTP_BAD_REQUEST }))),
    );
    await expect(answerMfaChallenge(SERVER, 'c1', '000000')).resolves.toBe('Challenge expired');
  });
});

describe('magic links', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('asks the server to email a link', async () => {
    const fetchMock = answer({ status: 'accepted' });
    await requestMagicLink(SERVER, 'ada@example.com');
    expect(sent(fetchMock)).toEqual([`${SERVER}/v1/auth/magic-link/request`, 'POST', '{"email":"ada@example.com"}']);
  });

  it('redeems a link for a session or a second-factor challenge', async () => {
    answer({ token: 'jwt-1', user_id: 'u1', mfa_required: false });
    await expect(verifyMagicLink(SERVER, 'link-1')).resolves.toEqual({ token: 'jwt-1' });
    answer({ user_id: 'u1', mfa_required: true, challenge_token: 'c1', methods: [] });
    const challenge = await verifyMagicLink(SERVER, 'link-2');
    expect(isMfaChallenge(challenge)).toBe(true);
  });
});
