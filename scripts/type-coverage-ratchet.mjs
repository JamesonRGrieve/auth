#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * type-coverage ratchet — percentage of expressions with non-`any` types.
 * Baseline file: .type-coverage-baseline (decimal percent, e.g. "92.5").
 * Fails when coverage DROPS below baseline.
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const BASELINE_PATH = resolve(process.cwd(), '.type-coverage-baseline');
const updateMode = process.argv.includes('--update');

let output;
try {
  output = execSync('./node_modules/.bin/type-coverage', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
  });
} catch (err) {
  output = (err.stdout?.toString() || '') + (err.stderr?.toString() || '');
}

// Output: "12345 / 12999 95.23%"
const match = output.match(/\(?(\d+)\s*\/\s*(\d+)\)?\s*([\d.]+)%/);
if (!match) {
  console.error('[type-coverage-ratchet] could not parse output');
  console.error(output);
  process.exit(2);
}
const current = parseFloat(match[3]);

if (updateMode) {
  writeFileSync(BASELINE_PATH, `${current}\n`, 'utf8');
  console.log(`[type-coverage-ratchet] baseline updated to ${current}%`);
  process.exit(0);
}

if (!existsSync(BASELINE_PATH)) {
  writeFileSync(BASELINE_PATH, `${current}\n`, 'utf8');
  console.log(`[type-coverage-ratchet] baseline missing — initialised at ${current}%`);
  process.exit(0);
}

const baseline = parseFloat(readFileSync(BASELINE_PATH, 'utf8').trim());

if (current < baseline) {
  console.error(`[type-coverage-ratchet] FAIL: coverage dropped ${baseline}% -> ${current}%.`);
  process.exit(1);
}
if (current > baseline) {
  console.log(`[type-coverage-ratchet] OK: coverage improved ${baseline}% -> ${current}%.`);
  console.log('Raise the baseline: pnpm type-coverage:ratchet:update');
  process.exit(0);
}
console.log(`[type-coverage-ratchet] OK: coverage unchanged at ${current}%.`);
process.exit(0);
