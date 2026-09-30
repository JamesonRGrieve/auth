// SPDX-License-Identifier: AGPL-3.0-or-later
import type { StorybookConfig } from '@storybook/nextjs';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx|mdx)'],
  // Storybook 9+ ships actions, controls, viewport and interactions in core.
  addons: ['@storybook/addon-links', '@storybook/addon-docs'],
  framework: {
    name: '@storybook/nextjs',
    options: {},
  },
  staticDirs: [],
};
export default config;
