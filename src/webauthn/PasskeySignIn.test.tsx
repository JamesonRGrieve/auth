// SPDX-License-Identifier: AGPL-3.0-or-later
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { testAuthConfig } from '../../tests/fixtures/authConfig';
import { FakeCredential, type FakeBrowser, fakeBrowser } from '../../tests/fixtures/webauthn';
import { AuthenticationContext } from '../AuthenticationContext';
import { PasskeySignIn } from './PasskeySignIn';

const HTTP_OK = 200;
const SIGN_IN = 'Sign in with a passkey';
const OPENED = { ceremony_id: 'c1', public_key: { challenge: 'Y2g', userVerification: 'required' } };

const renderButton = (onSignedIn: () => void, email: string | null = null): ReturnType<typeof render> =>
  render(
    <AuthenticationContext value={testAuthConfig}>
      <PasskeySignIn email={email} onSignedIn={onSignedIn} />
    </AuthenticationContext>,
  );

const reply = (...bodies: [number, object][]): void => {
  const fetchMock = vi.fn();
  for (const [status, body] of bodies) {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }));
  }
  vi.stubGlobal('fetch', fetchMock);
};

describe('PasskeySignIn', () => {
  let browser: FakeBrowser | null = null;

  afterEach(() => {
    browser?.restore();
    browser = null;
    vi.unstubAllGlobals();
  });

  it('shows nothing where the browser can’t use passkeys', () => {
    const view = renderButton(vi.fn());
    expect(view.queryByRole('button', { name: SIGN_IN })).not.toBeInTheDocument();
  });

  it('signs in with a passkey', async () => {
    browser = fakeBrowser(new FakeCredential({ id: 'a2V5' }));
    reply([HTTP_OK, OPENED], [HTTP_OK, { token: 'jwt' }]);
    const onSignedIn = vi.fn();
    const user = userEvent.setup();
    const view = renderButton(onSignedIn, 'ada@example.com');
    await user.click(view.getByRole('button', { name: SIGN_IN }));
    await vi.waitFor(() => {
      expect(onSignedIn).toHaveBeenCalled();
    });
    expect(view.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('says so when the user cancels', async () => {
    browser = fakeBrowser(new FakeCredential({}), new DOMException('', 'NotAllowedError'));
    reply([HTTP_OK, OPENED]);
    const onSignedIn = vi.fn();
    const user = userEvent.setup();
    const view = renderButton(onSignedIn);
    await user.click(view.getByRole('button', { name: SIGN_IN }));
    expect(await view.findByRole('alert')).toHaveTextContent('The request was cancelled, or it timed out.');
    expect(onSignedIn).not.toHaveBeenCalled();
  });
});
