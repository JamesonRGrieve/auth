#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Count `@keyframes` blocks AND `animation:` / `animation-*:` declarations
 * across the repo's CSS surface — src CSS/SCSS files plus the
 * `theme.extend.animation` and `theme.extend.keyframes` entries in
 * `tailwind.config.js`.
 *
 * Direction: this count should fall as animations are extracted into reusable
 * Tailwind utilities / `tw-animate-*` rather than living inline.
 *
 * Output: prints the count to stdout. Writes `.animation-coverage.json` with
 * a full breakdown for the ratchet to compare against `.animation-baseline`.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = process.cwd();
const SRC = resolve(ROOT, 'src');
const TAILWIND_CONFIG = resolve(ROOT, 'tailwind.config.js');

function walk(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      out.push(...walk(full));
    } else if (/\.(css|scss)$/i.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const cssFiles = walk(SRC).sort();

let keyframesBlocks = 0;
let animationDeclarations = 0;
const perFile = {};

/**
 * Strip top-level `@theme { ... }` blocks before counting.
 *
 * In Tailwind v4, `@theme {}` is the CSS-first equivalent of the legacy
 * `tailwind.config.js` `theme.extend` — its `@keyframes` and
 * `--animate-*` custom-property declarations are *token definitions*, not
 * inline animation usage. Counting them here would double-charge for the
 * same animation that's tracked in `tailwind.config.js` (when present) and
 * would block the ratchet from reaching zero in v4 repos that have
 * correctly migrated their animation tokens into `@theme`.
 */
function stripThemeBlocks(text) {
  let out = '';
  let i = 0;
  while (i < text.length) {
    const themeIdx = text.indexOf('@theme', i);
    if (themeIdx === -1) {
      out += text.slice(i);
      break;
    }
    out += text.slice(i, themeIdx);
    const braceStart = text.indexOf('{', themeIdx);
    if (braceStart === -1) {
      i = text.length;
      break;
    }
    let depth = 0;
    let end = text.length;
    for (let j = braceStart; j < text.length; j += 1) {
      const ch = text[j];
      if (ch === '{') depth += 1;
      else if (ch === '}') {
        depth -= 1;
        if (depth === 0) {
          end = j + 1;
          break;
        }
      }
    }
    i = end;
  }
  return out;
}

for (const path of cssFiles) {
  const raw = readFileSync(path, 'utf8');
  const text = stripThemeBlocks(raw);
  const kf = (text.match(/@keyframes\s+[A-Za-z0-9_-]+\s*\{/g) ?? []).length;
  const decls = (text.match(/^\s*animation(?:-[a-z-]+)?\s*:/gm) ?? []).length;
  if (kf || decls) {
    perFile[path] = { keyframes: kf, animationDeclarations: decls };
  }
  keyframesBlocks += kf;
  animationDeclarations += decls;
}

let tailwindKeyframes = 0;
let tailwindAnimations = 0;
if (existsSync(TAILWIND_CONFIG)) {
  const text = readFileSync(TAILWIND_CONFIG, 'utf8');
  // Count entries inside `keyframes: { ... }` and `animation: { ... }`
  // by extracting the immediate balanced block after each key.
  const extractBlock = (key) => {
    const idx = text.indexOf(`${key}:`);
    if (idx === -1) return '';
    const braceStart = text.indexOf('{', idx);
    if (braceStart === -1) return '';
    let depth = 0;
    for (let i = braceStart; i < text.length; i += 1) {
      const ch = text[i];
      if (ch === '{') depth += 1;
      else if (ch === '}') {
        depth -= 1;
        if (depth === 0) return text.slice(braceStart, i + 1);
      }
    }
    return '';
  };
  const kfBlock = extractBlock('keyframes');
  const anBlock = extractBlock('animation');
  // Count top-level keys: identifiers (quoted or bare) followed by `:` at
  // depth 1 inside the block.
  const countTopLevelKeys = (block) => {
    let depth = 0;
    let count = 0;
    let pendingKey = false;
    for (let i = 0; i < block.length; i += 1) {
      const ch = block[i];
      if (ch === '{') {
        depth += 1;
        if (depth === 1) pendingKey = true;
      } else if (ch === '}') {
        depth -= 1;
      } else if (depth === 1 && ch === ':' && pendingKey) {
        count += 1;
        pendingKey = false;
      } else if (depth === 1 && ch === ',') {
        pendingKey = true;
      }
    }
    return count;
  };
  tailwindKeyframes = countTopLevelKeys(kfBlock);
  tailwindAnimations = countTopLevelKeys(anBlock);
}

const total = keyframesBlocks + animationDeclarations + tailwindKeyframes + tailwindAnimations;

const report = {
  generatedAt: new Date().toISOString(),
  cssFiles,
  css: { keyframesBlocks, animationDeclarations },
  tailwindConfig: { keyframes: tailwindKeyframes, animations: tailwindAnimations },
  total,
  perFile,
};

writeFileSync('.animation-coverage.json', `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(total);
