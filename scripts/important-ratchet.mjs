#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * !important ratchet — count of `!important` declarations in CSS files,
 * inline `style={{...}}` strings, and styled snippets across src/.
 * Baseline file: .important-baseline (plain integer).
 */
import { readdirSync, readFileSync, statSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(process.cwd(), 'src');
const BASELINE_PATH = resolve(process.cwd(), '.important-baseline');
const updateMode = process.argv.includes('--update');
const EXTS = new Set(['.css', '.scss', '.less', '.ts', '.tsx', '.js', '.jsx', '.mdx']);

function* walk(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist') continue;
      yield* walk(p);
    } else {
      yield p;
    }
  }
}

let current = 0;
const hits = [];
for (const file of walk(ROOT)) {
  const ext = file.slice(file.lastIndexOf('.'));
  if (!EXTS.has(ext)) continue;
  const content = readFileSync(file, 'utf8');
  const matches = content.match(/!important/g);
  if (matches) {
    current += matches.length;
    hits.push(`${file}: ${matches.length}`);
  }
}

if (updateMode) {
  writeFileSync(BASELINE_PATH, `${current}\n`, 'utf8');
  console.log(`[important-ratchet] baseline updated to ${current}`);
  process.exit(0);
}

if (!existsSync(BASELINE_PATH)) {
  writeFileSync(BASELINE_PATH, `${current}\n`, 'utf8');
  console.log(`[important-ratchet] baseline missing — initialised at ${current}`);
  process.exit(0);
}

const baseline = parseInt(readFileSync(BASELINE_PATH, 'utf8').trim(), 10);
if (current > baseline) {
  console.error(`[important-ratchet] FAIL: !important uses ${baseline} -> ${current}.`);
  console.error(hits.join('\n'));
  process.exit(1);
}
if (current < baseline) {
  console.log(`[important-ratchet] OK: !important uses ${baseline} -> ${current}.`);
  process.exit(0);
}
console.log(`[important-ratchet] OK: !important uses unchanged at ${current}.`);
process.exit(0);
