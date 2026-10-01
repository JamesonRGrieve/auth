// SPDX-License-Identifier: AGPL-3.0-or-later
// Public entry point for @zephyrex/auth.
//
// Curated barrel of the package's primary surface. Consumers may import the
// common components, hooks, and helpers from the package root, e.g.
// `import { Login, hasSession } from '@zephyrex/auth'`. Less-common modules
// (mfa, oauth2, the server middleware, the NavMenu types) remain available via
// their subpath exports (`@zephyrex/auth/oauth2/OAuth`, `@zephyrex/auth/auth.middleware`, …)
// and are intentionally NOT re-exported here, to keep the server middleware out of the
// client-facing root. The signed-in user's account and team pages are the app's.

// Primary auth UI components (default exports re-bound to named exports).
export { default as AuthCard, ResponseMessage } from './AuthCard';
export { default as ErrorPage } from './ErrorPage';
export { default as Identify } from './Identify';
export { default as Login } from './Login';
export { MfaChallenge } from './mfa/MfaChallenge';
export { passwordLogin, completeMfaLogin, isMfaChallenge } from './mfa/mfaApi';
export type { MfaChallenge as MfaLoginChallenge, LoginAnswer } from './mfa/mfaApi';
export { default as Logout } from './Logout';
export { default as Register } from './Register';
export { PasswordRules } from './PasswordRules';
export { default as Subscribe } from './Subscribe';
export { default as AuthRouter } from './Router';

// Context and hooks.
export { AuthenticationContext } from './AuthenticationContext';
export { AuthServerProvider, useAuthServer } from './AuthServerContext';
export { CSRF_COOKIE, CSRF_HEADER, SESSION_COOKIE, SESSION_CREDENTIALS, csrfHeaders, hasSession } from './lib/session';
export { useAuthentication } from './useAuthentication';

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
