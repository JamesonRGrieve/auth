// SPDX-License-Identifier: AGPL-3.0-or-later
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { testAuthConfig } from '../../tests/fixtures/authConfig';
import { FakeCredential, type FakeBrowser, fakeBrowser } from '../../tests/fixtures/webauthn';
import { AuthenticationContext } from '../AuthenticationContext';
import { SecondFactor } from './SecondFactor';
import type { MfaChallenge } from './mfaApi';

const HTTP_OK = 200;
const HTTP_UNAUTHORIZED = 401;
const SECURITY_KEY = 'Use a security key';

const challengeWith = (...types: string[]): MfaChallenge => ({
  mfa_required: true,
  challenge_token: 'c1',
  methods: types.map((type, index) => ({ id: `m${String(index)}`, method_type: type })),
});

const renderStep = (challenge: MfaChallenge, onSignedIn: () => void): ReturnType<typeof render> =>
  render(
    <AuthenticationContext value={testAuthConfig}>
      <SecondFactor challenge={challenge} onSignedIn={onSignedIn} onStartOver={vi.fn()} />
    </AuthenticationContext>,
  );

const reply = (...bodies: [number, object][]): void => {
  const fetchMock = vi.fn();
  for (const [status, body] of bodies) {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }));
  }
  vi.stubGlobal('fetch', fetchMock);
};

describe('SecondFactor', () => {
  let browser: FakeBrowser | null = null;

  afterEach(() => {
    browser?.restore();
    browser = null;
    vi.unstubAllGlobals();
  });

  it('signs in with a code, and keeps the challenge open after a wrong one', async () => {
    reply([HTTP_UNAUTHORIZED, { detail: 'Invalid MFA code' }], [HTTP_OK, { token: 'jwt' }]);
    const onSignedIn = vi.fn();
    const user = userEvent.setup();
    const view = renderStep(challengeWith('totp'), onSignedIn);
    const code = view.getByLabelText('Authenticator or recovery code');
    await user.type(code, '000000');
    await user.click(view.getByRole('button', { name: 'Verify' }));
    expect(await view.findByRole('alert')).toHaveTextContent('Invalid MFA code');
    await user.clear(code);
    await user.type(code, '123456');
    await user.click(view.getByRole('button', { name: 'Verify' }));
    await vi.waitFor(() => {
      expect(onSignedIn).toHaveBeenCalled();
    });
  });

  it('offers a security key only when the account has one and the browser can use it', () => {
    expect(
      renderStep(challengeWith('webauthn'), vi.fn()).queryByRole('button', { name: SECURITY_KEY }),
    ).not.toBeInTheDocument();
    browser = fakeBrowser(new FakeCredential({ id: 'a2V5' }));
    expect(renderStep(challengeWith('totp'), vi.fn()).queryByRole('button', { name: SECURITY_KEY })).not.toBeInTheDocument();
  });

  it('signs in with a security key', async () => {
    browser = fakeBrowser(new FakeCredential({ id: 'a2V5' }));
    reply([HTTP_OK, { ceremony_id: 'k1', public_key: { challenge: 'Y2g' } }], [HTTP_OK, { token: 'jwt' }]);
    const onSignedIn = vi.fn();
    const user = userEvent.setup();
    const view = renderStep(challengeWith('totp', 'webauthn'), onSignedIn);
    await user.click(view.getByRole('button', { name: SECURITY_KEY }));
    await vi.waitFor(() => {
      expect(onSignedIn).toHaveBeenCalled();
    });
  });

  it('says why a security key failed', async () => {
    browser = fakeBrowser(new FakeCredential({}), new DOMException('', 'NotAllowedError'));
    reply([HTTP_OK, { ceremony_id: 'k1', public_key: { challenge: 'Y2g' } }]);
    const onSignedIn = vi.fn();
    const user = userEvent.setup();
    const view = renderStep(challengeWith('webauthn'), onSignedIn);
    await user.click(view.getByRole('button', { name: SECURITY_KEY }));
    expect(await view.findByRole('alert')).toHaveTextContent('The request was cancelled, or it timed out.');
    expect(onSignedIn).not.toHaveBeenCalled();
  });
});
