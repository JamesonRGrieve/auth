// SPDX-License-Identifier: AGPL-3.0-or-later
// A browser that can run WebAuthn ceremonies, for tests (jsdom has none): its PublicKeyCredential
// reads WebAuthn JSON as is, and navigator.credentials answers with `credential` or refuses with
// `refusal`.
import { vi } from 'vitest';

/** A credential the fake authenticator hands back, whose JSON is `json`. */
export class FakeCredential {
  static parseCreationOptionsFromJSON<T>(options: T): T {
    return options;
  }

  static parseRequestOptionsFromJSON<T>(options: T): T {
    return options;
  }

  constructor(private readonly json: Record<string, string>) {}

  toJSON(): Record<string, string> {
    return this.json;
  }
}

export interface FakeBrowser {
  create: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  /** Puts jsdom back as it was. */
  restore: () => void;
}

/** Installs the fake browser; each ceremony answers with `credential`, or rejects with `refusal` when given. */
export function fakeBrowser(credential: FakeCredential, refusal?: DOMException): FakeBrowser {
  const answer = vi.fn(async () => (refusal === undefined ? Promise.resolve(credential) : Promise.reject(refusal)));
  const get = vi.fn(answer);
  const create = vi.fn(answer);
  vi.stubGlobal('PublicKeyCredential', FakeCredential);
  Object.defineProperty(navigator, 'credentials', { configurable: true, value: { create, get } });
  return {
    create,
    get,
    restore: () => {
      vi.unstubAllGlobals();
      Reflect.deleteProperty(navigator, 'credentials');
    },
  };
}
