import type { Preview } from '@storybook/nextjs';
import { createElement } from 'react';
import { AuthServerProvider } from '../src/AuthServerContext';
import { TEST_AUTH_SERVER } from '../tests/fixtures/authConfig';
import './../src/app/globals.css';

export const globalTypes = {
  theme: {
    name: 'Default Theme',
    title: 'Default Theme',
    description: 'The theme that stories will start in. Changing this will also change the theme live.',
    defaultValue: 'light',
    toolbar: {
      icon: 'paintbrush',
      dynamicTitle: true,
      items: [
        { value: 'light', left: '☀️🌈', title: 'Light Mode' },
        { value: 'lightColorblind', left: '☀️🩶', title: 'Light Colorblind Mode' },
        { value: 'dark', left: '🌙🌈', title: 'Dark Mode' },
        { value: 'darkColorblind', left: '🌙🩶', title: 'Dark Colorblind Mode' },
      ],
    },
  },
};

const preview: Preview = {
  // Components that call the API find it the way an app provides it; stories have no server behind it.
  decorators: [(Story) => createElement(AuthServerProvider, { baseUrl: TEST_AUTH_SERVER }, createElement(Story))],
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    docs: {},
  },
};

export default preview;
