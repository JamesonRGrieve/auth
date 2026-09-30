#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Lockfile validator — refuses unresolved entries, missing integrity hashes,
 * or workspace drift. Exits non-zero on problems. No baseline (binary gate).
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOCKFILE = resolve(process.cwd(), 'pnpm-lock.yaml');
if (!existsSync(LOCKFILE)) {
  console.error('[lockfile-validate] pnpm-lock.yaml missing.');
  process.exit(1);
}

const content = readFileSync(LOCKFILE, 'utf8');
const problems = [];

if (/resolution:\s*\{\s*\}/.test(content)) {
  problems.push('found empty resolution: {} entries (unresolved deps)');
}
const integrityCount = (content.match(/integrity:\s*sha/g) ?? []).length;
const resolvedCount = (content.match(/resolution:\s*\{/g) ?? []).length;
if (resolvedCount > 0 && integrityCount === 0) {
  problems.push('no integrity hashes found in lockfile');
}

try {
  execSync('./node_modules/.bin/pnpm install --frozen-lockfile --offline --ignore-scripts --prefer-offline', {
    stdio: 'pipe',
    encoding: 'utf8',
  });
} catch (err) {
  const msg = (err.stdout?.toString() || '') + (err.stderr?.toString() || '');
  if (/ERR_PNPM_OUTDATED_LOCKFILE|ERR_PNPM_LOCKFILE/.test(msg)) {
    problems.push('pnpm-lock.yaml is out of sync with package.json');
  }
}

if (problems.length > 0) {
  console.error('[lockfile-validate] FAIL:');
  for (const p of problems) console.error(` - ${p}`);
  process.exit(1);
}
console.log('[lockfile-validate] OK');
process.exit(0);
