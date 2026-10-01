// SPDX-License-Identifier: AGPL-3.0-or-later
// Public entry point for @zephyrex/auth.
//
// Curated barrel of the package's primary surface. Consumers may import the
// common components, hooks, and helpers from the package root, e.g.
// `import { Login, useUser } from '@zephyrex/auth'`. Less-common modules
// (management tables, mfa, oauth2, the server middleware, the NavMenu types) remain
// available via their existing subpath exports (`@zephyrex/auth/management/Team`,
// `@zephyrex/auth/auth.middleware`, …) and are intentionally NOT re-exported here
// to avoid name collisions (e.g. `Team` is exported by two management modules)
// and to keep the server middleware out of the client-facing root.

// Primary auth UI components (default exports re-bound to named exports).
export { default as AuthCard, ResponseMessage } from './AuthCard';
export { default as ErrorPage } from './ErrorPage';
export { default as Identify } from './Identify';
export { default as Login } from './Login';
export { CopyButton } from './components/CopyButton';
export { MfaSettings } from './mfa/MfaSettings';
export { MfaChallenge } from './mfa/MfaChallenge';
export { mfaApi, passwordLogin, completeMfaLogin, isMfaChallenge } from './mfa/mfaApi';
export type { MfaMethod, MfaChallenge as MfaLoginChallenge, TotpProvisioning, LoginAnswer } from './mfa/mfaApi';
export { default as Logout } from './Logout';
export { default as Register } from './Register';
export { PasswordRules } from './PasswordRules';
export { default as Subscribe } from './Subscribe';
export { default as AuthRouter } from './Router';
export { default as OrganizationalUnitPage } from './OU';

// Context and hooks.
export { AuthenticationContext } from './AuthenticationContext';
export { AuthServerProvider, useAuthServer } from './AuthServerContext';
export { CSRF_COOKIE, CSRF_HEADER, SESSION_COOKIE, SESSION_CREDENTIALS, csrfHeaders, hasSession } from './lib/session';
export { useAuthentication } from './useAuthentication';
export { useUser } from './hooks/useUser';
export { useTeam } from './hooks/useTeam';

// Helpers.
export * from './utils';
export { getGravatarUrl } from './gravatar';

// Public types.
export type { AuthenticationConfig } from './Router';
export type { AuthCardProps } from './AuthCard';
export type { ErrorPageProps } from './ErrorPage';
export type { IdentifyProps } from './Identify';
export type { LoginProps } from './Login';
export type { LogoutProps } from './Logout';
export type { RegisterProps } from './Register';
export type { PasswordRulesProps } from './PasswordRules';
export type { SubscribeProps } from './Subscribe';
