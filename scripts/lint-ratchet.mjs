#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * ESLint warning ratchet. Runs eslint and compares the warning count to
 * .eslint-warning-baseline. Fails when the count goes UP, succeeds when it
 * goes down or stays the same. The baseline is committed to git; once a PR
 * lowers it, update the baseline file in the same commit.
 *
 * Usage:
 *   node scripts/lint-ratchet.mjs            # check
 *   node scripts/lint-ratchet.mjs --update   # rewrite baseline to current count
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const BASELINE_PATH = resolve(process.cwd(), '.eslint-warning-baseline');
const ESLINT_TARGET = process.env.LINT_TARGET ?? '.';
const ESLINT_EXTS = process.env.LINT_EXTS ?? '.js,.jsx,.ts,.tsx,.mjs,.cjs';
const args = process.argv.slice(2);
const updateMode = args.includes('--update');

let lintOutput;
const lintOutputPath = resolve(tmpdir(), `auth-eslint-${process.pid}.json`);
try {
  execSync(`./node_modules/.bin/eslint ${ESLINT_TARGET} --ext ${ESLINT_EXTS} --format json > "${lintOutputPath}"`, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
    shell: '/bin/bash',
    env: { ...process.env },
  });
} catch (err) {
  if (existsSync(lintOutputPath)) {
    lintOutput = readFileSync(lintOutputPath, 'utf8');
  } else {
    lintOutput = err.stdout?.toString() || '';
  }
}

if (!lintOutput && existsSync(lintOutputPath)) {
  lintOutput = readFileSync(lintOutputPath, 'utf8');
}
if (existsSync(lintOutputPath)) {
  unlinkSync(lintOutputPath);
}

let results;
try {
  results = JSON.parse(lintOutput);
} catch (err) {
  console.error('[lint-ratchet] failed to parse eslint JSON output');
  console.error(err.message);
  console.error('---raw output---');
  console.error(lintOutput?.slice(0, 2000));
  process.exit(2);
}

const errorCount = results.reduce((sum, r) => sum + r.errorCount, 0);
const warningCount = results.reduce((sum, r) => sum + r.warningCount, 0);

if (errorCount > 0) {
  console.error(`[lint-ratchet] FAIL: eslint reported ${errorCount} error(s). Errors are not allowed.`);
  const offenders = results
    .filter((r) => r.errorCount > 0)
    .slice(0, 10)
    .map((r) => `  ${r.filePath}: ${r.errorCount} error(s)`)
    .join('\n');
  if (offenders) {
    console.error(offenders);
  }
  process.exit(1);
}

if (updateMode) {
  writeFileSync(BASELINE_PATH, `${warningCount}\n`, 'utf8');
  console.log(`[lint-ratchet] baseline updated to ${warningCount}`);
  process.exit(0);
}

if (!existsSync(BASELINE_PATH)) {
  writeFileSync(BASELINE_PATH, `${warningCount}\n`, 'utf8');
  console.log(`[lint-ratchet] baseline file missing — initialised at ${warningCount}`);
  process.exit(0);
}

const baseline = parseInt(readFileSync(BASELINE_PATH, 'utf8').trim(), 10);
if (Number.isNaN(baseline)) {
  console.error(`[lint-ratchet] cannot parse baseline at ${BASELINE_PATH}`);
  process.exit(2);
}

if (warningCount > baseline) {
  console.error(
    `[lint-ratchet] FAIL: eslint warnings increased ${baseline} -> ${warningCount} (+${warningCount - baseline}).`,
  );
  console.error('Either fix the new warnings or, if intentional, run: pnpm lint:ratchet:update');
  process.exit(1);
}

if (warningCount < baseline) {
  console.log(`[lint-ratchet] OK: eslint warnings decreased ${baseline} -> ${warningCount} (-${baseline - warningCount}).`);
  console.log('Lower the baseline in the same commit: pnpm lint:ratchet:update');
  process.exit(0);
}

console.log(`[lint-ratchet] OK: eslint warnings unchanged at ${warningCount}.`);
process.exit(0);
