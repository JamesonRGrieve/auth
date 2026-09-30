// SPDX-License-Identifier: AGPL-3.0-or-later
// How the identity providers the server supports are shown. The server holds each provider's
// client credentials, scopes and endpoints; the browser only needs a label and an icon.
import type { ReactNode } from 'react';
import { LuLink } from 'react-icons/lu';
import { RiAmazonFill, RiGitBranchLine, RiGithubFill, RiGoogleFill, RiMicrosoftFill } from 'react-icons/ri';

export interface OAuth2ProviderDisplay {
  label: string;
  icon: ReactNode;
}

const providers: Readonly<Record<string, OAuth2ProviderDisplay>> = {
  amazon: { label: 'Amazon', icon: <RiAmazonFill /> },
  forgejo: { label: 'Forgejo', icon: <RiGitBranchLine /> },
  github: { label: 'GitHub', icon: <RiGithubFill /> },
  google: { label: 'Google', icon: <RiGoogleFill /> },
  microsoft: { label: 'Microsoft', icon: <RiMicrosoftFill /> },
};

const providersByName: ReadonlyMap<string, OAuth2ProviderDisplay> = new Map(Object.entries(providers));

/**
 * How to show a provider the server names (in any case, e.g. `google`); an unknown one gets its
 * name capitalised and a generic icon.
 */
export const oauth2ProviderDisplay = (name: string): OAuth2ProviderDisplay =>
  providersByName.get(name.toLowerCase()) ?? { label: name.charAt(0).toUpperCase() + name.slice(1), icon: <LuLink /> };

export default providers;
