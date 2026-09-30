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
import { AuthRouter, AuthServerProvider, useUser } from '@zephyrex/auth';

// Every hook and page calls the API through the provider's base: '' or '/api' when the app
// proxies the API on its own origin (required: sessions are HttpOnly same-origin cookies).
<AuthServerProvider baseUrl='/api'>{children}</AuthServerProvider>;
```

Guard pages in Next middleware with `createAuthMiddleware` from `@zephyrex/auth/auth.middleware`:

```ts
const guard = createAuthMiddleware({
  authPath: '/user',
  // Where the Next server reaches the API: fixed configuration, never the request's Host, because
  // the session check sends the user's cookie there.
  apiBase: 'http://localhost:1996',
  privateRoutes: ['/chat'],
});
```

For OAuth sign-in, list the providers in the router config (`oauthProviders: ['google']`) and allow
`<app>/user/close/<provider>` as a redirect URI on the server.

The root export carries the primary components, hooks and helpers. Less common modules are importable by path, e.g. `@zephyrex/auth/management/Team` or `@zephyrex/auth/auth.middleware`.

The package is ESM, compiled for bundlers (Next.js, Vite).

## License

AGPL-3.0-or-later
