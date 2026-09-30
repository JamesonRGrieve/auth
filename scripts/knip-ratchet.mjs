#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Knip ratchet — count of unused exports/files/dependencies reported by `knip`.
 * Baseline file: .knip-baseline (plain integer count).
 *
 * Usage:
 *   node scripts/knip-ratchet.mjs            # check
 *   node scripts/knip-ratchet.mjs --update   # rewrite baseline
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const BASELINE_PATH = resolve(process.cwd(), '.knip-baseline');
const updateMode = process.argv.includes('--update');

let output;
try {
  output = execSync('./node_modules/.bin/knip --reporter json --no-exit-code', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
  });
} catch (err) {
  output = (err.stdout?.toString() || '') + (err.stderr?.toString() || '');
}

let current = 0;
try {
  // Knip JSON: { files: [...], issues: [{ file, dependencies: [...], devDependencies: [...], exports: [...], types: [...], duplicates: [...], unlisted: [...], ... }] }
  const startIdx = output.indexOf('{');
  const endIdx = output.lastIndexOf('}');
  if (startIdx === -1 || endIdx === -1) {
    throw new Error('no JSON in knip output');
  }
  const data = JSON.parse(output.slice(startIdx, endIdx + 1));
  current += data.files?.length ?? 0;
  for (const issue of data.issues ?? []) {
    for (const k of [
      'dependencies',
      'devDependencies',
      'optionalPeerDependencies',
      'unlisted',
      'binaries',
      'unresolved',
      'exports',
      'types',
      'nsExports',
      'nsTypes',
      'duplicates',
      'enumMembers',
      'classMembers',
    ]) {
      const v = issue[k];
      if (Array.isArray(v)) {
        current += v.length;
      } else if (v && typeof v === 'object') {
        for (const list of Object.values(v)) {
          if (Array.isArray(list)) current += list.length;
        }
      }
    }
  }
} catch (err) {
  console.error('[knip-ratchet] failed to parse knip JSON output');
  console.error(err.message);
  console.error('---raw output---');
  console.error(output.slice(0, 2000));
  process.exit(2);
}

if (updateMode) {
  writeFileSync(BASELINE_PATH, `${current}\n`, 'utf8');
  console.log(`[knip-ratchet] baseline updated to ${current}`);
  process.exit(0);
}

if (!existsSync(BASELINE_PATH)) {
  writeFileSync(BASELINE_PATH, `${current}\n`, 'utf8');
  console.log(`[knip-ratchet] baseline file missing — initialised at ${current}`);
  process.exit(0);
}

const baseline = parseInt(readFileSync(BASELINE_PATH, 'utf8').trim(), 10);
if (Number.isNaN(baseline)) {
  console.error(`[knip-ratchet] cannot parse baseline at ${BASELINE_PATH}`);
  process.exit(2);
}

if (current > baseline) {
  console.error(`[knip-ratchet] FAIL: knip issues increased ${baseline} -> ${current} (+${current - baseline}).`);
  console.error('Either remove the unused code or run: pnpm knip:ratchet:update');
  process.exit(1);
}

if (current < baseline) {
  console.log(`[knip-ratchet] OK: knip issues decreased ${baseline} -> ${current} (-${baseline - current}).`);
  console.log('Lower the baseline in the same commit: pnpm knip:ratchet:update');
  process.exit(0);
}

console.log(`[knip-ratchet] OK: knip issues unchanged at ${current}.`);
process.exit(0);
