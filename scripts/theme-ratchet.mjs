#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Theme ratchet — counts of hard-coded color and non-token spacing literals
 * in CSS. Direction: neither count may rise. Baseline is JSON with
 * `{ colors, spacing }`.
 *
 * Usage:
 *   node scripts/theme-ratchet.mjs            # check
 *   node scripts/theme-ratchet.mjs --update   # rewrite baseline to current counts
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const BASELINE_PATH = resolve(process.cwd(), '.theme-baseline');
const COVERAGE_SCRIPT = resolve(process.cwd(), 'scripts/theme-coverage.mjs');
const COVERAGE_FILE = resolve(process.cwd(), '.theme-coverage.json');
const updateMode = process.argv.includes('--update');

try {
  execSync(`node "${COVERAGE_SCRIPT}"`, {
    stdio: ['ignore', 'ignore', 'inherit'],
    maxBuffer: 16 * 1024 * 1024,
  });
} catch (err) {
  console.error('[theme-ratchet] coverage script failed');
  console.error(err.message);
  process.exit(2);
}

if (!existsSync(COVERAGE_FILE)) {
  console.error(`[theme-ratchet] coverage file missing at ${COVERAGE_FILE}`);
  process.exit(2);
}

const coverage = JSON.parse(readFileSync(COVERAGE_FILE, 'utf8'));
const current = { colors: coverage.colors ?? 0, spacing: coverage.spacing ?? 0 };

if (updateMode) {
  writeFileSync(BASELINE_PATH, `${JSON.stringify(current, null, 2)}\n`, 'utf8');
  console.log(`[theme-ratchet] baseline updated to ${JSON.stringify(current)}`);
  process.exit(0);
}

if (!existsSync(BASELINE_PATH)) {
  writeFileSync(BASELINE_PATH, `${JSON.stringify(current, null, 2)}\n`, 'utf8');
  console.log(`[theme-ratchet] baseline file missing — initialised at ${JSON.stringify(current)}`);
  process.exit(0);
}

let baseline;
try {
  baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
} catch (err) {
  console.error(`[theme-ratchet] cannot parse baseline JSON at ${BASELINE_PATH}`);
  console.error(err.message);
  process.exit(2);
}

const regressions = [];
for (const key of ['colors', 'spacing']) {
  const cur = current[key] ?? 0;
  const base = baseline[key] ?? 0;
  if (cur > base) {
    regressions.push(`${key}: ${base} -> ${cur} (+${cur - base})`);
  }
}

if (regressions.length > 0) {
  console.error('[theme-ratchet] FAIL: theme literals increased.');
  for (const r of regressions) console.error(`  ${r}`);
  console.error(`See ${COVERAGE_FILE} for per-file breakdown.`);
  console.error('Replace hard-coded literals with design tokens, or, if intentional, run: pnpm theme:ratchet:update');
  process.exit(1);
}

const improvements = [];
for (const key of ['colors', 'spacing']) {
  const cur = current[key] ?? 0;
  const base = baseline[key] ?? 0;
  if (cur < base) improvements.push(`${key}: ${base} -> ${cur} (-${base - cur})`);
}

if (improvements.length > 0) {
  console.log('[theme-ratchet] OK: theme literals decreased.');
  for (const i of improvements) console.log(`  ${i}`);
  console.log('Lower the baseline in the same commit: pnpm theme:ratchet:update');
  process.exit(0);
}

console.log(`[theme-ratchet] OK: theme literals unchanged at ${JSON.stringify(current)}.`);
process.exit(0);
