# @zephyrex/auth

Authentication UI for Next.js apps on the Zephyrex server: identify, login, register, MFA, OAuth2 provider buttons, and account/team management pages.

## Install

```bash
pnpm add @zephyrex/auth react react-dom next zod
```

`react`, `react-dom`, `next` and `zod` are peer dependencies. Components are styled with Tailwind CSS 4 utility classes and ship no stylesheet, so add the package (and `@jgrieve/forms`, which it builds on) to your Tailwind sources:

```css
@import 'tailwindcss';
@source '../node_modules/@zephyrex/auth/dist';
@source '../node_modules/@jgrieve/forms/dist';
```

## Usage

```tsx
import { AuthRouter, useUser } from '@zephyrex/auth';
```

The root export carries the primary components, hooks and helpers. Less common modules are importable by path, e.g. `@zephyrex/auth/management/Team` or `@zephyrex/auth/auth.middleware`.

The package is ESM, compiled for bundlers (Next.js, Vite).

## License

AGPL-3.0-or-later
