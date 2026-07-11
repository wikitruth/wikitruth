import path from 'node:path';
import { fileURLToPath } from 'node:url';

const configDirectory = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('@storybook/react-webpack5').StorybookConfig} */
const config = {
  stories: ['../client/src/**/*.mdx', '../client/src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/react-webpack5',
    options: {},
  },
  typescript: {
    reactDocgen: false,
  },
  staticDirs: ['../public'],
  webpackFinal: async (webpackConfig) => {
    if (!webpackConfig.module) {
      webpackConfig.module = { rules: [] };
    }

    if (!webpackConfig.module.rules) {
      webpackConfig.module.rules = [];
    }

    webpackConfig.module.rules.push({
      test: /\.(ts|tsx)$/,
      include: path.resolve(configDirectory, '../client'),
      exclude: /node_modules/,
      use: [
        {
          loader: fileURLToPath(import.meta.resolve('ts-loader')),
          options: {
            transpileOnly: true,
          },
        },
      ],
    });

    if (!webpackConfig.resolve) {
      webpackConfig.resolve = {};
    }

    const extensions = webpackConfig.resolve.extensions || [];
    webpackConfig.resolve.extensions = Array.from(new Set([...extensions, '.ts', '.tsx']));

    return webpackConfig;
  },
};

export default config;
