#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Animation ratchet — count of `@keyframes` blocks and `animation*:`
 * declarations across src CSS/SCSS files plus the keyframes/animation
 * entries inside `tailwind.config.js`. Direction: count cannot RISE.
 *
 * Run `node scripts/animation-coverage.mjs` first (or rely on the inline
 * recount below) to regenerate `.animation-coverage.json`.
 *
 * Usage:
 *   node scripts/animation-ratchet.mjs            # check
 *   node scripts/animation-ratchet.mjs --update   # rewrite baseline to current count
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const BASELINE_PATH = resolve(process.cwd(), '.animation-baseline');
const COVERAGE_SCRIPT = resolve(process.cwd(), 'scripts/animation-coverage.mjs');
const COVERAGE_FILE = resolve(process.cwd(), '.animation-coverage.json');
const updateMode = process.argv.includes('--update');

let currentStr;
try {
  currentStr = execSync(`node "${COVERAGE_SCRIPT}"`, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
    maxBuffer: 16 * 1024 * 1024,
  }).trim();
} catch (err) {
  console.error('[animation-ratchet] coverage script failed');
  console.error(err.message);
  process.exit(2);
}

const current = parseInt(currentStr.split('\n').pop(), 10);
if (Number.isNaN(current)) {
  console.error(`[animation-ratchet] coverage script did not print a number (got: ${currentStr})`);
  process.exit(2);
}

if (updateMode) {
  writeFileSync(BASELINE_PATH, `${current}\n`, 'utf8');
  console.log(`[animation-ratchet] baseline updated to ${current}`);
  process.exit(0);
}

if (!existsSync(BASELINE_PATH)) {
  writeFileSync(BASELINE_PATH, `${current}\n`, 'utf8');
  console.log(`[animation-ratchet] baseline file missing — initialised at ${current}`);
  process.exit(0);
}

const baseline = parseInt(readFileSync(BASELINE_PATH, 'utf8').trim(), 10);
if (Number.isNaN(baseline)) {
  console.error(`[animation-ratchet] cannot parse baseline at ${BASELINE_PATH}`);
  process.exit(2);
}

if (current > baseline) {
  console.error(`[animation-ratchet] FAIL: animation surface increased ${baseline} -> ${current} (+${current - baseline}).`);
  console.error(`  See ${COVERAGE_FILE} for per-file breakdown.`);
  console.error(
    'Extract the new animation into a reusable Tailwind utility, or, if intentional, run: pnpm animation:ratchet:update',
  );
  process.exit(1);
}

if (current < baseline) {
  console.log(`[animation-ratchet] OK: animation surface decreased ${baseline} -> ${current} (-${baseline - current}).`);
  console.log('Lower the baseline in the same commit: pnpm animation:ratchet:update');
  process.exit(0);
}

console.log(`[animation-ratchet] OK: animation surface unchanged at ${current}.`);
process.exit(0);
