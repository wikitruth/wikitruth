const path = require('path');

/** @type {import('@storybook/react-webpack5').StorybookConfig} */
const config = {
  stories: ['../client/src/**/*.mdx', '../client/src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-interactions'],
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
      include: path.resolve(__dirname, '../client'),
      exclude: /node_modules/,
      use: [
        {
          loader: require.resolve('ts-loader'),
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
