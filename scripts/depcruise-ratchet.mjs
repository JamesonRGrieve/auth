#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * dependency-cruiser ratchet — count of violations (forbidden rules).
 * Baseline file: .depcruise-baseline (plain integer count).
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const BASELINE_PATH = resolve(process.cwd(), '.depcruise-baseline');
const updateMode = process.argv.includes('--update');

let output;
try {
  output = execSync('./node_modules/.bin/depcruise --config .dependency-cruiser.cjs --output-type json src', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
  });
} catch (err) {
  output = (err.stdout?.toString() || '') + (err.stderr?.toString() || '');
}

let current = 0;
try {
  const startIdx = output.indexOf('{');
  const endIdx = output.lastIndexOf('}');
  const data = JSON.parse(output.slice(startIdx, endIdx + 1));
  current = data.summary?.violations?.length ?? 0;
} catch (err) {
  console.error('[depcruise-ratchet] failed to parse output');
  console.error(err.message);
  console.error(output.slice(0, 2000));
  process.exit(2);
}

if (updateMode) {
  writeFileSync(BASELINE_PATH, `${current}\n`, 'utf8');
  console.log(`[depcruise-ratchet] baseline updated to ${current}`);
  process.exit(0);
}

if (!existsSync(BASELINE_PATH)) {
  writeFileSync(BASELINE_PATH, `${current}\n`, 'utf8');
  console.log(`[depcruise-ratchet] baseline missing — initialised at ${current}`);
  process.exit(0);
}

const baseline = parseInt(readFileSync(BASELINE_PATH, 'utf8').trim(), 10);

if (current > baseline) {
  console.error(`[depcruise-ratchet] FAIL: violations ${baseline} -> ${current} (+${current - baseline}).`);
  process.exit(1);
}
if (current < baseline) {
  console.log(`[depcruise-ratchet] OK: violations decreased ${baseline} -> ${current}.`);
  console.log('Lower the baseline: pnpm deps:ratchet:update');
  process.exit(0);
}
console.log(`[depcruise-ratchet] OK: violations unchanged at ${current}.`);
process.exit(0);
