# Claude Code Instructions — @zephyrex/auth

Authentication UI package for the Zephyrex framework, published as `@zephyrex/auth` and consumed by `zephyrex` (client framework) as a normal dependency. ESM, compiled to `dist/`; `react`, `react-dom`, `next` and `zod` are peers.

## Stack Standards

Read **before your first edit**:

- `/home/jameson/Source/ai-prompts/typescript.md`
- `/home/jameson/Source/ai-prompts/react-next.md`

---

## Architecture

```
src/
  index.ts              Barrel export (AuthRouter, hooks, components)
  Router.tsx            Multi-page auth router (identify → login → register → MFA → manage)
  auth.middleware.ts    Next.js middleware hooks (useAuth, useOAuth2, useJWTQueryParam)
  hooks/                useUser, useTeam, useTeamUsers, useLoggedIn, useInvitation
  management/           Profile, Team, TeamUsers, Invitations, ConnectedServices, Account
  mfa/                  Authenticator (TOTP), Email, SMS verification
  oauth2/               50+ OAuth2 provider configs, OAuth flow component
  Stripe/               PricingTable integration
  components/           shadcn/ui primitives, data-table components
```

### Auth Flow

Three modes (set by comparing `AUTH_URI` with `APP_URI`):

1. **MagicalAuth** — integrated auth (`AUTH_URI` = `APP_URI/user`)
2. **GTAuth** — separate auth server
3. **None** — no auth

JWT stored in `jwt` cookie. Login via `Basic base64(email:password)` to `POST /v1/user/authorize`.

### Dependencies

- `@jgrieve/forms` — UI primitives (Button, Input, Label) and DynamicForm
- `zod2gql` — Zod schema → GraphQL query generation (`toGQL(schema, type, options)`)

Until those two are published, `pnpm-workspace.yaml` overrides them to the sibling checkouts as injected `file:` copies, so their peers resolve to this package's single React and zod. Drop the overrides once they are on npm.

---

## Commands

```bash
pnpm install
pnpm compile          # Build to dist/
pnpm storybook        # Storybook on port 6006
pnpm check            # All ratchets
```

## Coverage

53 components, 53 stories, 56 tests. Full story/test parity.

## License

AGPL-3.0-or-later. SPDX header on every source file.
