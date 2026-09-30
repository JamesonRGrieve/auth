#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * CSS ratchet — stylelint warning/error count across CSS files in src/.
 * Baseline file: .css-baseline (plain integer).
 * Exits 0 with note if no CSS files exist.
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const BASELINE_PATH = resolve(process.cwd(), '.css-baseline');
const updateMode = process.argv.includes('--update');
const SRC = resolve(process.cwd(), 'src');

function* walk(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist') continue;
      yield* walk(p);
    } else if (entry.endsWith('.css') || entry.endsWith('.scss')) {
      yield p;
    }
  }
}

const cssFiles = [...walk(SRC)];
if (cssFiles.length === 0) {
  console.log('[css-ratchet] no CSS/SCSS files under src/ — skipping');
  if (updateMode) writeFileSync(BASELINE_PATH, '0\n', 'utf8');
  process.exit(0);
}

let output;
try {
  const stdout = execSync(`./node_modules/.bin/stylelint --formatter json "src/**/*.css" "src/**/*.scss" 2>&1`, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
  });
  output = stdout;
} catch (err) {
  output = (err.stdout?.toString() || '') + (err.stderr?.toString() || '');
}

let current = 0;
try {
  const startIdx = output.indexOf('[');
  const endIdx = output.lastIndexOf(']');
  const arr = JSON.parse(output.slice(startIdx, endIdx + 1));
  for (const file of arr) {
    current += file.warnings?.length ?? 0;
  }
} catch (err) {
  console.error('[css-ratchet] failed to parse stylelint JSON output');
  console.error(err.message);
  console.error(output.slice(0, 2000));
  process.exit(2);
}

if (updateMode) {
  writeFileSync(BASELINE_PATH, `${current}\n`, 'utf8');
  console.log(`[css-ratchet] baseline updated to ${current}`);
  process.exit(0);
}

if (!existsSync(BASELINE_PATH)) {
  writeFileSync(BASELINE_PATH, `${current}\n`, 'utf8');
  console.log(`[css-ratchet] baseline missing — initialised at ${current}`);
  process.exit(0);
}

const baseline = parseInt(readFileSync(BASELINE_PATH, 'utf8').trim(), 10);
if (current > baseline) {
  console.error(`[css-ratchet] FAIL: stylelint warnings ${baseline} -> ${current}.`);
  process.exit(1);
}
if (current < baseline) {
  console.log(`[css-ratchet] OK: stylelint warnings ${baseline} -> ${current}.`);
  process.exit(0);
}
console.log(`[css-ratchet] OK: stylelint warnings unchanged at ${current}.`);
process.exit(0);
