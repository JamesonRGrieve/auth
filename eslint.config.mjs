// SPDX-License-Identifier: AGPL-3.0-or-later
// ESLint 10 flat config.
import eslintComments from '@eslint-community/eslint-plugin-eslint-comments';
import eslintCommentsConfigs from '@eslint-community/eslint-plugin-eslint-comments/configs';
import { fixupPluginRules } from '@eslint/compat';
import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import reactPluginLegacy from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import unusedImports from 'eslint-plugin-unused-imports';
import importPluginLegacy from 'eslint-plugin-import';
import jsxA11yLegacy from 'eslint-plugin-jsx-a11y';
import optimizeRegexLegacy from 'eslint-plugin-optimize-regex';
import prettierPlugin from 'eslint-plugin-prettier';
import promise from 'eslint-plugin-promise';
import securityPlugin from 'eslint-plugin-security';
import sonarjsPlugin from 'eslint-plugin-sonarjs';
import vitest from '@vitest/eslint-plugin';
import storybookPlugin from 'eslint-plugin-storybook';

// These plugins have no ESLint 10 release yet; the official compat shim restores the
// context APIs (getFilename, getScope, ...) their rules still call.
const reactPlugin = fixupPluginRules(reactPluginLegacy);
const jsxA11y = fixupPluginRules(jsxA11yLegacy);
const importPlugin = fixupPluginRules(importPluginLegacy);
const optimizeRegexPlugin = fixupPluginRules(optimizeRegexLegacy);

// Workspace §7.5 model: every rule is warn-level and ratcheted (lint:ratchet
// forbids *any* error). Plugin "recommended" presets ship many rules at
// `error`; demote them to `warn` so they ride the ratchet toward zero rather
// than hard-blocking the commit (the established pattern for this repo).
const demote = (rules = {}) =>
  Object.fromEntries(
    Object.entries(rules).map(([id, val]) => {
      if (val === 'error' || val === 2) return [id, 'warn'];
      if (Array.isArray(val) && (val[0] === 'error' || val[0] === 2)) return [id, ['warn', ...val.slice(1)]];
      return [id, val];
    }),
  );

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'dist.next/**',
      'dist.old/**',
      'storybook-static/**',
      '.next/**',
      'coverage/**',
      '.storybook/**',
      'scripts/**',
      '*.config.{js,cjs,mjs,ts}',
      'playwright.storybook.config.ts',
    ],
  },
  { ...js.configs.recommended, rules: demote(js.configs.recommended.rules) },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
        // Lint against a dedicated tsconfig that also includes stories
        // and tests (the build tsconfig.json excludes *.stories.*),
        // so type-aware rules cover them instead of hard-failing.
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        process: 'readonly',
        fetch: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        global: 'readonly',
        React: 'readonly',
        JSX: 'readonly',
        NodeJS: 'readonly',
        HTMLElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLFormElement: 'readonly',
        HTMLTextAreaElement: 'readonly',
        Event: 'readonly',
        MouseEvent: 'readonly',
        KeyboardEvent: 'readonly',
        FormData: 'readonly',
        File: 'readonly',
        FileReader: 'readonly',
        Blob: 'readonly',
        FocusEvent: 'readonly',
        ChangeEvent: 'readonly',
        Image: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        prompt: 'readonly',
        location: 'readonly',
        history: 'readonly',
        crypto: 'readonly',
        AbortController: 'readonly',
        FormDataEntryValue: 'readonly',
        RequestInit: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        Headers: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react': reactPlugin,
      'react-hooks': reactHooksPlugin,
      'unused-imports': unusedImports,
      'import': importPlugin,
      'jsx-a11y': jsxA11y,
      '@eslint-community/eslint-comments': eslintComments,
      promise,
    },
    settings: {
      'react': { version: 'detect' },
      'import/resolver': { typescript: { project: './tsconfig.eslint.json' } },
    },
    rules: {
      // Errors from base recommended that are too noisy for legacy code:
      'no-unused-vars': 'off',
      'no-undef': 'off', // TS handles undef checks; many React/JSX globals not declared
      'no-empty': 'warn',
      'no-prototype-builtins': 'warn',
      'no-useless-escape': 'warn',
      'no-case-declarations': 'warn',
      'no-constant-condition': 'warn',
      'no-fallthrough': 'warn',
      'no-irregular-whitespace': 'warn',
      'no-async-promise-executor': 'warn',
      'no-empty-pattern': 'warn',
      'no-extra-boolean-cast': 'warn',
      'no-self-assign': 'warn',
      'no-sparse-arrays': 'warn',
      'no-unsafe-finally': 'warn',
      'no-unsafe-optional-chaining': 'warn',

      // Hygiene
      'unused-imports/no-unused-imports': 'warn',
      'react/jsx-uses-react': 'warn',
      'react/jsx-uses-vars': 'warn',
      'react/no-unescaped-entities': 'warn',
      // Existing source has rules-of-hooks violations inside table-cell
      // render fns. Track as warnings via the ratchet baseline; flip back
      // to 'error' once the baseline reaches zero for these specific rules.
      'react-hooks/rules-of-hooks': 'warn',
      'no-redeclare': 'warn',
      'no-constant-binary-expression': 'warn',
      'no-import-assign': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',

      // Workspace §7.5 recommended rulesets — merged from the named
      // plugins. All effectively warn-level via the lint ratchet.
      ...demote(jsxA11y.configs.recommended.rules),
      ...demote(eslintCommentsConfigs.recommended.rules),
      ...demote(promise.configs.recommended.rules),

      // Workspace §7.4 ruleset (foundry-parity). All warn-level, absorbed
      // by lint:ratchet. Existing baseline must be reseeded after the
      // first install via `pnpm lint:ratchet:update`.
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],
      '@typescript-eslint/consistent-type-exports': ['warn', { fixMixedExportsWithInlineTypeSpecifier: true }],
      '@typescript-eslint/no-import-type-side-effects': 'warn',
      '@typescript-eslint/method-signature-style': ['warn', 'property'],
      '@typescript-eslint/no-useless-empty-export': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'warn',
      '@typescript-eslint/no-confusing-non-null-assertion': 'warn',
      '@typescript-eslint/ban-ts-comment': [
        'warn',
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': true,
          'ts-nocheck': true,
          'minimumDescriptionLength': 5,
        },
      ],
      '@typescript-eslint/dot-notation': ['warn', { allowIndexSignaturePropertyAccess: true }],
      'dot-notation': 'off',

      // Type-aware (parserOptions.project enabled above)
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-misused-promises': 'warn',
      '@typescript-eslint/await-thenable': 'warn',
      '@typescript-eslint/require-await': 'warn',
      '@typescript-eslint/unbound-method': 'warn',
      '@typescript-eslint/no-base-to-string': 'warn',
      '@typescript-eslint/restrict-template-expressions': 'warn',
      '@typescript-eslint/restrict-plus-operands': 'warn',
      '@typescript-eslint/no-for-in-array': 'warn',
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/strict-boolean-expressions': [
        'warn',
        {
          allowString: true,
          allowNumber: true,
          allowNullableObject: true,
          allowNullableBoolean: false,
          allowNullableString: false,
          allowNullableNumber: false,
          allowAny: false,
        },
      ],
      '@typescript-eslint/prefer-nullish-coalescing': ['warn', { ignorePrimitives: { string: true } }],
      '@typescript-eslint/prefer-optional-chain': 'warn',
      '@typescript-eslint/switch-exhaustiveness-check': 'warn',
      '@typescript-eslint/no-unsafe-enum-comparison': 'warn',
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      '@typescript-eslint/no-unnecessary-type-arguments': 'warn',
      '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
      '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'warn',
      '@typescript-eslint/no-meaningless-void-operator': 'warn',
      '@typescript-eslint/no-mixed-enums': 'warn',
      '@typescript-eslint/no-duplicate-type-constituents': 'warn',
      '@typescript-eslint/no-redundant-type-constituents': 'warn',
      '@typescript-eslint/no-deprecated': 'warn',
      '@typescript-eslint/prefer-enum-initializers': 'warn',
      '@typescript-eslint/prefer-reduce-type-parameter': 'warn',
      '@typescript-eslint/prefer-return-this-type': 'warn',
      '@typescript-eslint/prefer-includes': 'warn',
      '@typescript-eslint/prefer-string-starts-ends-with': 'warn',
      '@typescript-eslint/prefer-find': 'warn',
      '@typescript-eslint/prefer-readonly': 'warn',
      '@typescript-eslint/require-array-sort-compare': ['warn', { ignoreStringArrays: true }],
      '@typescript-eslint/promise-function-async': 'warn',
      '@typescript-eslint/return-await': ['warn', 'in-try-catch'],

      // Workspace §7.5 additional rules.
      'no-use-before-define': 'off',
      '@typescript-eslint/no-use-before-define': ['warn', { functions: false, classes: false }],
      '@typescript-eslint/no-unused-expressions': 'warn',
      '@typescript-eslint/no-implied-eval': 'warn',
      '@typescript-eslint/explicit-function-return-type': [
        'warn',
        { allowExpressions: true, allowTypedFunctionExpressions: true, allowHigherOrderFunctions: true },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'warn',
      'no-new-native-nonconstructor': 'warn',
      'no-duplicate-imports': 'warn',
      'no-loss-of-precision': 'warn',

      // eslint-plugin-import rules (§7.5).
      'import/order': [
        'warn',
        {
          'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'never',
          'alphabetize': { order: 'asc' },
        },
      ],
      'import/no-cycle': ['warn', { maxDepth: 4, ignoreExternal: true }],
      'import/no-self-import': 'warn',
      'import/no-useless-path-segments': 'warn',
      'import/no-duplicates': 'warn',
      'import/newline-after-import': 'warn',
      'import/first': 'warn',

      // Naming convention — foundry-parity selector list.
      '@typescript-eslint/naming-convention': [
        'warn',
        { selector: 'default', format: ['camelCase'], leadingUnderscore: 'allow', trailingUnderscore: 'allow' },
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'allow',
        },
        { selector: 'parameter', format: ['camelCase', 'PascalCase'], leadingUnderscore: 'allow' },
        { selector: 'function', format: ['camelCase', 'PascalCase'] },
        { selector: 'method', format: ['camelCase', 'PascalCase'], leadingUnderscore: 'allow' },
        { selector: 'typeMethod', format: ['camelCase', 'PascalCase'], leadingUnderscore: 'allow' },
        { selector: 'classicAccessor', format: ['camelCase', 'UPPER_CASE'] },
        { selector: 'memberLike', modifiers: ['private'], format: ['camelCase'], leadingUnderscore: 'allow' },
        {
          selector: 'classProperty',
          modifiers: ['static'],
          format: ['UPPER_CASE', 'camelCase', 'PascalCase'],
          leadingUnderscore: 'allow',
        },
        { selector: 'typeLike', format: ['PascalCase'] },
        { selector: 'enumMember', format: ['UPPER_CASE', 'PascalCase'] },
        { selector: 'objectLiteralProperty', format: null },
        { selector: 'typeProperty', format: null },
        { selector: 'import', format: ['camelCase', 'PascalCase'] },
      ],

      'no-shadow': 'off',
      '@typescript-eslint/no-shadow': [
        'warn',
        {
          builtinGlobals: true,
          hoist: 'all',
          allow: [
            // `import * as React` is the standard namespace import; React is an
            // ambient global via the JSX runtime, so this is never a real shadow.
            'React',
            // React type imports that collide with DOM lib global names — these
            // are type-only imports, never a real runtime shadow.
            'ChangeEvent',
            'event',
            'name',
            'location',
            'origin',
            'parent',
            'prompt',
            'toolbar',
            'status',
            'length',
            'top',
            'close',
            'open',
            'stop',
            'history',
            'confirm',
            'document',
            'innerWidth',
            'innerHeight',
            'source',
            'selection',
            'match',
          ],
        },
      ],
      'no-self-compare': 'warn',
      'no-template-curly-in-string': 'warn',
      'no-unreachable-loop': 'warn',
      'no-new-func': 'warn',
      'no-useless-concat': 'warn',
      'no-useless-return': 'warn',
      'no-lonely-if': 'warn',
      'no-unneeded-ternary': 'warn',
      'no-await-in-loop': 'warn',
      'no-promise-executor-return': 'warn',
      'require-atomic-updates': 'warn',
      'array-callback-return': 'warn',
      'no-constructor-return': 'warn',
      'default-case-last': 'warn',
      'grouped-accessor-pairs': 'warn',
      'prefer-arrow-callback': ['warn', { allowNamedFunctions: true }],
      'prefer-rest-params': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'warn',
      'no-alert': 'warn',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-throw-literal': 'warn',
      'eqeqeq': ['warn', 'always'],
      'curly': ['warn', 'all'],
      'prefer-template': 'warn',
      'no-param-reassign': ['warn', { props: false }],
      'consistent-return': 'warn',
      'complexity': ['warn', 25],
      'max-depth': ['warn', 5],

      'no-restricted-syntax': [
        'warn',
        {
          selector: "TSAsExpression > TSTypeReference[typeName.name='Record'] > TSTypeParameterInstantiation > TSAnyKeyword",
          message:
            'Avoid `as Record<string, any>`. Type the value precisely; use `Record<string, unknown>` only at framework boundaries.',
        },
        {
          selector: 'TSAsExpression > TSUnknownKeyword',
          message: 'Avoid `as unknown` to bypass type errors. Validate at the boundary and propagate the narrow type.',
        },
        {
          selector: "TSAsExpression[typeAnnotation.type='TSAnyKeyword']",
          message: 'Avoid `as any`. Fix the type at its source.',
        },
        {
          // Catch-clause variables are genuinely exempt (the bare selector was
          // flagging `catch (e: unknown)`, which is the correct, encouraged form).
          selector: 'TSTypeAnnotation > TSUnknownKeyword:not(CatchClause TSUnknownKeyword)',
          message:
            '`unknown` outside `catch` is a smell. Validate at the boundary entry (Zod / type guard) and propagate the narrow type. Catch-clause variables are exempt.',
        },
      ],

      'react/jsx-key': 'error',
      'react/jsx-no-undef': 'error',
      'react/jsx-no-duplicate-props': 'warn',
      'react/jsx-no-target-blank': 'warn',
      'react/jsx-no-useless-fragment': 'warn',
      'react/jsx-pascal-case': 'warn',
      'react/no-array-index-key': 'warn',
      'react/no-children-prop': 'warn',
      'react/no-danger': 'warn',
      'react/no-deprecated': 'warn',
      'react/no-direct-mutation-state': 'warn',
      'react/no-unstable-nested-components': 'warn',
      'react/no-unused-state': 'warn',
      'react/self-closing-comp': 'warn',
    },
  },
  {
    // Rules carried over from the retired .eslintrc.json. Left out on purpose:
    // no-underscore-dangle (contradicts the `^_` unused-binding convention above),
    // react/jsx-closing-{bracket,tag}-location (formatting belongs to Prettier), and
    // @typescript-eslint/no-empty-interface (deprecated for no-empty-object-type).
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'security': securityPlugin,
      'sonarjs': sonarjsPlugin,
      'optimize-regex': optimizeRegexPlugin,
      'prettier': prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'warn',
      'no-var': 'warn',
      'prefer-const': 'warn',
      'no-eq-null': 'warn',
      'no-iterator': 'warn',
      'no-lone-blocks': 'warn',
      'no-loop-func': 'warn',
      'no-multi-str': 'warn',
      'no-return-assign': 'warn',
      'no-script-url': 'warn',
      'no-sequences': 'warn',
      'no-unmodified-loop-condition': 'warn',
      'no-unused-expressions': 'warn',
      'yoda': ['warn', 'never'],
      '@typescript-eslint/consistent-type-assertions': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-empty-function': 'warn',
      '@typescript-eslint/no-inferrable-types': 'warn',
      // `declare module` augmentation (e.g. JSX intrinsic elements) needs a namespace.
      '@typescript-eslint/no-namespace': ['warn', { allowDeclarations: true }],
      'import/no-absolute-path': 'warn',
      'import/no-dynamic-require': 'warn',
      'import/extensions': ['warn', 'never'],
      // Side-effect imports are allowed only for stylesheets and test-matcher setup.
      'import/no-unassigned-import': ['warn', { allow: ['**/*.css', '@testing-library/jest-dom/vitest'] }],
      'import/no-named-as-default': 'warn',
      'import/no-named-as-default-member': 'warn',
      'react/jsx-no-comment-textnodes': 'warn',
      'react/jsx-boolean-value': 'warn',
      'react/jsx-filename-extension': ['warn', { extensions: ['.jsx', '.tsx'] }],
      'react/no-danger-with-children': 'warn',
      'react/no-access-state-in-setstate': 'warn',
      'react/no-string-refs': 'warn',
      'react/prefer-stateless-function': 'warn',
      'jsx-a11y/accessible-emoji': 'warn',
      'security/detect-object-injection': 'warn',
      'security/detect-buffer-noassert': 'warn',
      'security/detect-child-process': 'warn',
      'security/detect-disable-mustache-escape': 'warn',
      'security/detect-eval-with-expression': 'warn',
      'security/detect-new-buffer': 'warn',
      'security/detect-no-csrf-before-method-override': 'warn',
      'security/detect-non-literal-fs-filename': 'warn',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-non-literal-require': 'warn',
      'security/detect-possible-timing-attacks': 'warn',
      'security/detect-pseudoRandomBytes': 'warn',
      'security/detect-unsafe-regex': 'warn',
      'sonarjs/no-all-duplicated-branches': 'warn',
      'sonarjs/no-duplicated-branches': 'warn',
      'sonarjs/no-element-overwrite': 'warn',
      'sonarjs/no-extra-arguments': 'warn',
      'sonarjs/no-identical-conditions': 'warn',
      'sonarjs/no-identical-expressions': 'warn',
      'sonarjs/no-identical-functions': 'warn',
      'sonarjs/no-inverted-boolean-check': 'warn',
      'sonarjs/no-redundant-boolean': 'warn',
      'sonarjs/no-small-switch': 'warn',
      'sonarjs/no-unused-collection': 'warn',
      'sonarjs/no-use-of-empty-return-value': 'warn',
      'sonarjs/no-useless-catch': 'warn',
      'sonarjs/prefer-immediate-return': 'warn',
      'sonarjs/prefer-object-literal': 'warn',
      'sonarjs/prefer-single-boolean-return': 'warn',
      'sonarjs/prefer-while': 'warn',
      'sonarjs/no-collapsible-if': 'warn',
      'sonarjs/no-collection-size-mischeck': 'warn',
      'sonarjs/no-redundant-jump': 'warn',
      'sonarjs/no-same-line-conditional': 'warn',
      'optimize-regex/optimize-regex': 'warn',
      '@eslint-community/eslint-comments/no-unused-disable': 'warn',
    },
  },
  {
    files: ['**/*.{js,jsx,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        module: 'readonly',
        require: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'warn',
    },
  },
  {
    files: ['tests/**/*.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    plugins: { vitest },
    // §7.5 mandates these at `error`; auth is an explicit bring-up repo
    // (warn + ratchet toward zero, see CLAUDE.md "Current State"), so they
    // are demoted to warn until the baseline reaches zero, then re-raised.
    rules: demote({
      ...vitest.configs.recommended.rules,
      // expectTypeOf(...) is a type-level assertion; without this the rule
      // flags every type-surface test as "no assertions".
      'vitest/expect-expect': ['error', { assertFunctionNames: ['expect', 'expectTypeOf'] }],
      'vitest/no-focused-tests': 'error',
      'vitest/no-disabled-tests': 'error',
      'vitest/no-identical-title': 'error',
      'vitest/consistent-test-it': ['error', { fn: 'it', withinDescribe: 'it' }],
      'vitest/valid-expect': 'error',
      'vitest/valid-title': 'error',
      'vitest/no-conditional-tests': 'warn',
      'vitest/no-conditional-in-test': 'warn',
      'vitest/no-conditional-expect': 'error',
    }),
  },
  {
    files: ['src/**/*.stories.{ts,tsx}'],
    plugins: { storybook: storybookPlugin },
    rules: {
      // `flat/recommended` exposes its rule object at index [1]; index [0]
      // is plugins-only. Pin the workspace-required story-hygiene rules
      // explicitly so the shape can't drift the config out from under us.
      'storybook/no-redundant-story-name': 'warn',
      'storybook/prefer-pascal-case': 'warn',
      // §7.5: story files relax type-annotation / naming / any rules.
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/naming-convention': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
