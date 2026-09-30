#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Biome diagnostics ratchet. Runs `biome lint src/` and compares the total
 * (errors + warnings) count against `.biome-baseline`. Fails when the count
 * rises; passes when it stays flat or drops. Lower the baseline in the same
 * commit via `pnpm biome:ratchet:update`.
 *
 * "info" diagnostics are advisory and not tracked.
 *
 * Usage:
 *   node scripts/biome-ratchet.mjs            # check
 *   node scripts/biome-ratchet.mjs --update   # rewrite baseline to current count
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const BASELINE_PATH = resolve(process.cwd(), '.biome-baseline');
const updateMode = process.argv.includes('--update');

let biomeOutput = '';
const biomeOutputPath = resolve(tmpdir(), `auth-biome-${process.pid}.json`);
try {
  execSync(`./node_modules/.bin/biome lint src/ --reporter=json > "${biomeOutputPath}"`, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 128 * 1024 * 1024,
    shell: '/bin/bash',
  });
} catch (err) {
  // Biome exits non-zero whenever diagnostics exist. The JSON report is still
  // written to the redirected file.
  if (existsSync(biomeOutputPath)) {
    biomeOutput = readFileSync(biomeOutputPath, 'utf8');
  } else {
    biomeOutput = err.stdout?.toString() || '';
  }
}

if (!biomeOutput && existsSync(biomeOutputPath)) {
  biomeOutput = readFileSync(biomeOutputPath, 'utf8');
}

if (existsSync(biomeOutputPath)) {
  unlinkSync(biomeOutputPath);
}

const jsonStart = biomeOutput.indexOf('{');
if (jsonStart > 0) {
  biomeOutput = biomeOutput.slice(jsonStart);
}

let report;
try {
  report = JSON.parse(biomeOutput);
} catch (err) {
  console.error('[biome-ratchet] failed to parse biome JSON output');
  console.error(err.message);
  console.error('---raw---');
  console.error(biomeOutput.slice(0, 2000));
  process.exit(2);
}

const summary = report.summary || {};
const errorCount = summary.errors ?? 0;
const warningCount = summary.warnings ?? 0;
const total = errorCount + warningCount;

if (updateMode) {
  writeFileSync(BASELINE_PATH, `${total}\n`, 'utf8');
  console.log(`[biome-ratchet] baseline updated to ${total} (errors=${errorCount}, warnings=${warningCount})`);
  process.exit(0);
}

if (!existsSync(BASELINE_PATH)) {
  writeFileSync(BASELINE_PATH, `${total}\n`, 'utf8');
  console.log(
    `[biome-ratchet] baseline file missing — initialised at ${total} (errors=${errorCount}, warnings=${warningCount})`,
  );
  process.exit(0);
}

const baseline = parseInt(readFileSync(BASELINE_PATH, 'utf8').trim(), 10);
if (Number.isNaN(baseline)) {
  console.error(`[biome-ratchet] cannot parse baseline at ${BASELINE_PATH}`);
  process.exit(2);
}

if (total > baseline) {
  console.error(`[biome-ratchet] FAIL: biome diagnostics increased ${baseline} -> ${total} (+${total - baseline}).`);
  console.error(`  errors=${errorCount}, warnings=${warningCount}`);
  console.error('Either fix the new diagnostics or, if intentional, run: pnpm biome:ratchet:update');
  process.exit(1);
}

if (total < baseline) {
  console.log(`[biome-ratchet] OK: biome diagnostics decreased ${baseline} -> ${total} (-${baseline - total}).`);
  console.log('Lower the baseline in the same commit: pnpm biome:ratchet:update');
  process.exit(0);
}

console.log(`[biome-ratchet] OK: biome diagnostics unchanged at ${total} (errors=${errorCount}, warnings=${warningCount}).`);
process.exit(0);
