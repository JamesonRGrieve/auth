import type { Preview } from '@storybook/nextjs';
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
