// SPDX-License-Identifier: AGPL-3.0-or-later
import { render } from '@testing-library/react';
import { deleteCookie, setCookie } from 'cookies-next/client';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { TEST_AUTH_SERVER as SERVER, testAuthConfig } from '../../tests/fixtures/authConfig';
import { AuthenticationContext } from '../AuthenticationContext';
import Close, { type CloseProps } from './Close';
import { rememberPending } from './pending';

const HTTP_OK = 200;
const HTTP_UNAUTHORIZED = 401;

const renderClose = (): ReturnType<typeof render> =>
  render(
    <AuthenticationContext value={testAuthConfig}>
      <Close />
    </AuthenticationContext>,
  );

describe('Close', () => {
  const realLocation = window.location;
  const replace = vi.fn();
  const close = vi.fn();

  const arriveWith = (search: string): void => {
    Object.defineProperty(window, 'location', { configurable: true, value: { search, replace } });
  };

  beforeEach(() => {
    sessionStorage.clear();
    replace.mockReset();
    close.mockReset();
    vi.spyOn(window, 'close').mockImplementation(close);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    Object.defineProperty(window, 'location', { configurable: true, value: realLocation });
  });

  it('finishes a link this browser started, then opens the account page', async () => {
    rememberPending(sessionStorage, { kind: 'link', provider: 'google', state: 's1' });
    const fetchMock = vi.fn(async () => Promise.resolve(new Response('{"linked":true}', { status: HTTP_OK })));
    vi.stubGlobal('fetch', fetchMock);
    arriveWith('?code=c1&state=s1');
    renderClose();
    await vi.waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/user/manage');
    });
    expect(fetchMock).toHaveBeenCalledWith(`${SERVER}/v1/oauth2_client/callback/google`, expect.anything());
    expect(close).not.toHaveBeenCalled();
  });

  it('finishes a sign-in, then continues where the user was headed', async () => {
    setCookie('href', '/chat/42');
    rememberPending(sessionStorage, { kind: 'signIn', provider: 'google', state: 's1' });
    const fetchMock = vi.fn(async () => Promise.resolve(new Response('{"session_key":"k"}', { status: HTTP_OK })));
    vi.stubGlobal('fetch', fetchMock);
    arriveWith('?code=c1&state=s1');
    renderClose();
    await vi.waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/chat/42');
    });
    expect(fetchMock).toHaveBeenCalledWith(
      `${SERVER}/v1/auth/oauth/callback`,
      expect.objectContaining({ body: '{"provider":"google","code":"c1","state":"s1"}' }),
    );
    deleteCookie('href');
  });

  it('closes a popup that was not a round trip it started', async () => {
    arriveWith('');
    renderClose();
    await vi.waitFor(() => {
      expect(close).toHaveBeenCalled();
    });
  });

  it('says why a link failed', async () => {
    rememberPending(sessionStorage, { kind: 'link', provider: 'google', state: 's1' });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Promise.resolve(new Response('{"detail":"provider exchange failed"}', { status: HTTP_UNAUTHORIZED })),
      ),
    );
    arriveWith('?code=c1&state=s1');
    const view = renderClose();
    expect(await view.findByRole('alert')).toHaveTextContent('provider exchange failed');
  });

  it('is a parameterless component with no public props', () => {
    expectTypeOf(Close).parameters.toEqualTypeOf<[]>();
    expectTypeOf<ReturnType<typeof Close>>().toExtend<ReactNode>();
    expectTypeOf<CloseProps>().toEqualTypeOf<Record<string, never>>();
  });
});
