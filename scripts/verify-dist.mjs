// SPDX-License-Identifier: AGPL-3.0-or-later
// Checks that every relative import in dist/ names a file that exists, i.e. that the
// build is loadable by Node's ESM resolver and not only by a bundler (which tolerates
// extensionless paths). Modules are parsed, not executed: many import next/navigation,
// which only resolves inside Next's own bundler.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const DIST = resolve('dist');
const RELATIVE_IMPORT = /(?:from|import)\s*\(?\s*['"](\.{1,2}\/[^'"]+)['"]/g;

const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      walk(full);
    } else if (name.endsWith('.js') || name.endsWith('.d.ts')) {
      files.push(full);
    }
  }
};
walk(DIST);

const broken = [];
for (const file of files) {
  for (const match of readFileSync(file, 'utf8').matchAll(RELATIVE_IMPORT)) {
    const target = resolve(dirname(file), match[1]);
    if (!existsSync(target) || statSync(target).isDirectory()) {
      broken.push(`${file.replace(`${DIST}/`, '')} -> ${match[1]}`);
    }
  }
}
if (broken.length > 0) {
  console.error(`[verify-dist] ${broken.length} relative imports do not name a file:`);
  for (const entry of broken) {
    console.error(`  ${entry}`);
  }
  process.exit(1);
}
console.warn(`[verify-dist] OK: every relative import in ${files.length} dist files names a file`);
