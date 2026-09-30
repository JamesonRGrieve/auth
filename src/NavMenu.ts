// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * The shape of a sidebar navigation entry. Which entries exist is the app's to declare (the
 * framework builds its sidebar from its config and enabled extensions), so this module holds only
 * the types.
 */
import type { ComponentType } from 'react';

// Version-agnostic icon type: lucide icons satisfy this, but the shared `Item`
// type is not pinned to a specific lucide-react/@types/react instance (so
// downstream consumers on a different lucide version still type-check).
export type IconComponent = ComponentType<{ className?: string; size?: string | number }>;

export type Item = {
  title: string;
  url?: string;
  visible?: boolean;
  icon?: IconComponent;
  isActive?: boolean;
  queryParams?: object;
  items?: {
    max_role?: number;
    title: string;
    icon?: IconComponent;
    url: string;
    queryParams?: object;
  }[];
};
