#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// Theme coverage: counts hard-coded color literals and non-token spacing
// in src/**/*.{css,scss}.
//
// Tracked:
//   colors:  hex (#abc, #aabbcc, #aabbccdd), rgb()/rgba()/hsl()/hsla() with
//            literal numeric values (skipped if hsl(var(--...))), and named
//            CSS colors used in common color properties.
//   spacing: literal px / rem / em / % values inside spacing-shaped
//            properties (margin*, padding*, gap, inset, top/right/bottom/left,
//            width/height when literal). `0` is exempt. Tokens via
//            var(--*) or theme(...) are exempt.
//
// Writes `.theme-coverage.json` with { colors, spacing, perFile }.

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir, exts) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, exts));
    else if (exts.some((e) => entry.name.endsWith(e))) out.push(full);
  }
  return out;
}

const CSS_SOURCES = walk('src', ['.css', '.scss']).sort();

const COLOR_PROPS = [
  'color',
  'background',
  'background-color',
  'border',
  'border-color',
  'fill',
  'stroke',
  'outline',
  'box-shadow',
  'text-shadow',
];
const SPACING_PROPS = [
  'margin',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'margin-inline',
  'margin-block',
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'padding-inline',
  'padding-block',
  'gap',
  'row-gap',
  'column-gap',
  'top',
  'right',
  'bottom',
  'left',
  'inset',
  'width',
  'height',
  'min-width',
  'min-height',
  'max-width',
  'max-height',
];

const HEX = /#[0-9a-f]{3,8}\b/gi;
const RGB_HSL = /(?:rgb|rgba|hsl|hsla)\s*\(\s*[^)]*\)/gi;
const NAMED =
  /\b(?:white|black|red|green|blue|yellow|orange|purple|pink|cyan|magenta|gray|grey|silver|gold|maroon|navy|teal|olive|lime|aqua|fuchsia)\b/gi;
const LITERAL_LEN = /(?<![\w.-])-?\d+(?:\.\d+)?(?:px|rem|em|%)\b/g;

function isTokenized(value) {
  return /var\s*\(\s*--/.test(value) || /theme\s*\(/.test(value);
}

let colors = 0;
let spacing = 0;
const perFile = {};

for (const path of CSS_SOURCES) {
  const text = readFileSync(path, 'utf8');
  // Strip comments
  const stripped = text.replace(/\/\*[\s\S]*?\*\//g, '');
  let fileColors = 0;
  let fileSpacing = 0;

  // Walk declarations: prop: value;
  const declRe = /([a-z-]+)\s*:\s*([^;{}]+)[;}]/gi;
  let m;
  while ((m = declRe.exec(stripped)) !== null) {
    const prop = m[1].toLowerCase();
    const value = m[2];

    if (COLOR_PROPS.includes(prop)) {
      // Count hex literals
      fileColors += (value.match(HEX) ?? []).length;
      // rgb/hsl with literal numerics (skip if inside contains var(--...))
      const fnMatches = value.match(RGB_HSL) ?? [];
      for (const fn of fnMatches) {
        if (!isTokenized(fn)) fileColors += 1;
      }
      // Named colors (but skip if value is purely var())
      if (!isTokenized(value)) {
        fileColors += (value.match(NAMED) ?? []).length;
      }
    }

    if (SPACING_PROPS.includes(prop)) {
      if (isTokenized(value)) continue;
      const matches = value.match(LITERAL_LEN) ?? [];
      for (const lit of matches) {
        // exempt zero
        if (/^-?0(?:\.0+)?(?:px|rem|em|%)?$/.test(lit)) continue;
        fileSpacing += 1;
      }
    }
  }

  if (fileColors || fileSpacing) perFile[path] = { colors: fileColors, spacing: fileSpacing };
  colors += fileColors;
  spacing += fileSpacing;
}

const report = {
  generatedAt: new Date().toISOString(),
  colors,
  spacing,
  perFile,
};

writeFileSync('.theme-coverage.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ colors, spacing }));
