#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * test-typecheck ratchet — `tsc --noEmit` errors restricted to test files
 * via tsconfig.test.json. Baseline file: .test-tsc-error-baseline.
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const BASELINE_PATH = resolve(process.cwd(), '.test-tsc-error-baseline');
const updateMode = process.argv.includes('--update');

const TS_PROJECT = 'tsconfig.test.json';
if (!existsSync(resolve(process.cwd(), TS_PROJECT))) {
  console.error(`[test-typecheck-ratchet] ${TS_PROJECT} missing — create it before running.`);
  process.exit(2);
}

let output;
try {
  output = execSync(`./node_modules/.bin/tsc --noEmit --pretty false -p ${TS_PROJECT}`, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
  });
} catch (err) {
  output = (err.stdout?.toString() || '') + (err.stderr?.toString() || '');
}

const errorLines = output.split('\n').filter((line) => /error TS\d+/.test(line));
const current = errorLines.length;

if (updateMode) {
  writeFileSync(BASELINE_PATH, `${current}\n`, 'utf8');
  console.log(`[test-typecheck-ratchet] baseline updated to ${current}`);
  process.exit(0);
}

if (!existsSync(BASELINE_PATH)) {
  writeFileSync(BASELINE_PATH, `${current}\n`, 'utf8');
  console.log(`[test-typecheck-ratchet] baseline missing — initialised at ${current}`);
  process.exit(0);
}

const baseline = parseInt(readFileSync(BASELINE_PATH, 'utf8').trim(), 10);
if (current > baseline) {
  console.error(`[test-typecheck-ratchet] FAIL: test tsc errors ${baseline} -> ${current}.`);
  process.exit(1);
}
if (current < baseline) {
  console.log(`[test-typecheck-ratchet] OK: test tsc errors ${baseline} -> ${current}.`);
  process.exit(0);
}
console.log(`[test-typecheck-ratchet] OK: test tsc errors unchanged at ${current}.`);
process.exit(0);
