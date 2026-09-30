#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Strict-mode ratchet — counts files that produce at least one error when
 * tsc is run with `--strict --strictNullChecks --noImplicitAny --noImplicitThis`
 * forced on, even when the repo's tsconfig has them off as tracked debt.
 *
 * Baseline file: .strict-baseline (plain integer count of failing files).
 * Long-term target: 0, at which point flip strict on in tsconfig.
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const BASELINE_PATH = resolve(process.cwd(), '.strict-baseline');
const updateMode = process.argv.includes('--update');

let output;
try {
  output = execSync(
    './node_modules/.bin/tsc --noEmit --pretty false --strict --strictNullChecks --noImplicitAny --noImplicitThis',
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 128 * 1024 * 1024 },
  );
} catch (err) {
  output = (err.stdout?.toString() || '') + (err.stderr?.toString() || '');
}

const filesWithErrors = new Set();
for (const line of output.split('\n')) {
  const m = line.match(/^([^(]+)\((\d+),(\d+)\):\s*error TS\d+/);
  if (m) {
    filesWithErrors.add(m[1].trim());
  }
}
const current = filesWithErrors.size;

if (updateMode) {
  writeFileSync(BASELINE_PATH, `${current}\n`, 'utf8');
  console.log(`[strict-ratchet] baseline updated to ${current}`);
  process.exit(0);
}

if (!existsSync(BASELINE_PATH)) {
  writeFileSync(BASELINE_PATH, `${current}\n`, 'utf8');
  console.log(`[strict-ratchet] baseline missing — initialised at ${current}`);
  process.exit(0);
}

const baseline = parseInt(readFileSync(BASELINE_PATH, 'utf8').trim(), 10);
if (current > baseline) {
  console.error(`[strict-ratchet] FAIL: strict-failing files ${baseline} -> ${current} (+${current - baseline}).`);
  process.exit(1);
}
if (current < baseline) {
  console.log(`[strict-ratchet] OK: strict-failing files ${baseline} -> ${current}.`);
  console.log('Lower the baseline: pnpm strict:ratchet:update');
  process.exit(0);
}
console.log(`[strict-ratchet] OK: strict-failing files unchanged at ${current}.`);
process.exit(0);
