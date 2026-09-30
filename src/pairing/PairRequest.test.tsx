// SPDX-License-Identifier: AGPL-3.0-or-later
import { act, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { testAuthConfig } from '../../tests/fixtures/authConfig';
import { AuthenticationContext } from '../AuthenticationContext';
import PairRequest, { PAIRING_POLL_MS } from './PairRequest';

const HTTP_OK = 200;
const APPROVE_URL = 'https://app.example.com/user/pair/approve?token=t1';

/** Answer /request, then each status read with the next state in `states`. */
const serve = (states: string[]): ReturnType<typeof vi.fn> => {
  const remaining = [...states];
  const fetchMock = vi.fn(async (url: string) => {
    const body = url.endsWith('/request')
      ? { pairing_id: 'p1', qr_payload: APPROVE_URL, expires_in: 300 }
      : { pairing_id: 'p1', state: remaining.shift() ?? 'pending' };
    return Promise.resolve(new Response(JSON.stringify(body), { status: HTTP_OK }));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

const renderPage = (): ReturnType<typeof render> =>
  render(
    <AuthenticationContext value={testAuthConfig}>
      <PairRequest />
    </AuthenticationContext>,
  );

describe('PairRequest', () => {
  const realLocation = window.location;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    Object.defineProperty(window, 'location', { configurable: true, value: { href: '', search: '' } });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    Object.defineProperty(window, 'location', { configurable: true, value: realLocation });
  });

  it('shows the pairing code, and continues signed in once the other device approves', async () => {
    const fetchMock = serve(['pending', 'approved']);
    const view = renderPage();
    expect(await view.findByTitle('Pairing code')).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(PAIRING_POLL_MS * 2);
    });
    expect(window.location.href).toBe('/user');
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/p1/status'))).toHaveLength(2);
  });

  it('says so when the other device turns it down, and starts over on request', async () => {
    const fetchMock = serve(['denied']);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    const view = renderPage();
    await view.findByTitle('Pairing code');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(PAIRING_POLL_MS);
    });
    expect(view.getByRole('alert')).toHaveTextContent('turned the sign-in down');
    await user.click(view.getByRole('button', { name: 'Start again' }));
    expect(await view.findByTitle('Pairing code')).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/request'))).toHaveLength(2);
  });
});
