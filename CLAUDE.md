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
  AuthServerContext.tsx AuthServerProvider: the app's one API base ('' / '/api' same-origin, or absolute)
  auth.middleware.ts    createAuthMiddleware({ authPath, apiBase, privateRoutes, landingOnly }) for Next middleware
  lib/api.ts            authRequest / authSend / authList: every call rides the session cookie
  lib/session.ts        Cookie names and the CSRF header for writes
  hooks/                useUser, useTeam(s), useTeamManagement, useUserInvitations, useProducts, …
  management/           Profile, Account, Team (switcher), TeamMembers, InviteForm, Invitations, ConnectedServices
  mfa/                  Authenticator (TOTP), Email, SMS verification
  oauth2/               OAuth sign-in (oauth_consumer), account linking (auth_oauth2_client), the close page
  Stripe/               PricingTable integration
  components/           shadcn/ui primitives, data-table components
```

### Sessions

The server keeps the session in HttpOnly cookies: `zx_session`, plus a readable `zx_csrf` whose value
goes in `X-CSRF-Token` on every write. Requests send `credentials: 'same-origin'` and never an
Authorization header, so the API must be same-origin (the app proxies `/v1` and `/graphql`). Nothing
here reads env for URLs: pages take `authServer` from `AuthServerProvider`, and `AuthenticationConfig`
carries `authPath`, `authModes` (`basic` / `magical` email sign-in) and `oauthProviders`.

Sign-in: password (`POST /v1/user/authorize`, then MFA when required), or an identity provider
(`POST /v1/auth/oauth/authorize` → provider → `<authPath>/close/<provider>` → `POST /v1/auth/oauth/callback`).
Sign-out: `POST /v1/user/logout`, which clears the cookies.

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

Every component has a story and a test (`pnpm symmetry`).

## License

AGPL-3.0-or-later. SPDX header on every source file.
