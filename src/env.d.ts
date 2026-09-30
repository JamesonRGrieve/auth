// SPDX-License-Identifier: AGPL-3.0-or-later
// Ambient typings for the environment variables this package reads.
// Declaring each as a named optional property lets `process.env.FOO` type-check
// under noPropertyAccessFromIndexSignature while keeping the value
// `string | undefined` (callers must still guard for absence).
export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      LOG_VERBOSITY_SERVER?: string;
      NEXT_PUBLIC_COOKIE_DOMAIN?: string;
      NEXT_PUBLIC_LOG_VERBOSITY_CLIENT?: string;
      NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID?: string;
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?: string;
    }
  }
}
