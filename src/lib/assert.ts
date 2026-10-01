'use client';
// SPDX-License-Identifier: AGPL-3.0-or-later
import { useEffect } from 'react';

export default function assert(test: boolean, message?: string): void {
  if (!test) {
    throw new Error(`Assertion Failure: ${message ?? 'No message provided.'}`);
  }
}

export function useAssertion(assertion: boolean, message: string, _dependencies: readonly unknown[]): void {
  useEffect(() => {
    assert(assertion, message);
  }, [assertion, message]);
}
