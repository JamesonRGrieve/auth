// SPDX-License-Identifier: AGPL-3.0-or-later
// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';
import log from './log';

describe('log', () => {
  let spy: MockInstance<(...args: unknown[]) => void>;

  beforeEach(() => {
    spy = vi.spyOn(console, 'log').mockImplementation(() => {
      /* swallow */
    });
  });

  afterEach(() => {
    spy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('uses the client option, not the server one, when a window exists', () => {
    vi.stubGlobal('window', {});
    log(['server-only'], { server: 1 });
    expect(spy).not.toHaveBeenCalled();
    log(['client'], { client: 1 });
    expect(spy).toHaveBeenCalledWith('client');
  });

  it('does nothing when neither client nor server verbosity is supplied', () => {
    log(['hidden']);
    expect(spy).not.toHaveBeenCalled();
  });

  it('prints to console when the server option meets the default threshold', () => {
    // Server context: window is undefined in node test runner -> uses server verbosity (default 3)
    log(['visible'], { server: 1 });
    expect(spy).toHaveBeenCalledWith('visible');
  });

  it('suppresses messages above the verbosity threshold', () => {
    log(['noisy'], { server: 99 });
    expect(spy).not.toHaveBeenCalled();
  });

  it('forwards all message arguments to console.log', () => {
    log(['a', 'b', 'c'], { server: 0 });
    expect(spy).toHaveBeenCalledWith('a', 'b', 'c');
  });
});
