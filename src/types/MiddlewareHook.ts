// SPDX-License-Identifier: AGPL-3.0-or-later
import type { NextRequest, NextResponse } from 'next/server.js';

export type MiddlewareHook = (req: NextRequest) => Promise<{
  activated: boolean;
  response: NextResponse;
}>;
