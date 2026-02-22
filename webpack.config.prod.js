const baseConfigFactory = require('./webpack.config');

module.exports = (env = {}, argv = {}) => {
  const baseConfig = baseConfigFactory(env, { ...argv, mode: 'production' });
  const { devServer, ...configWithoutDevServer } = baseConfig;

  return {
    ...configWithoutDevServer,
    mode: 'production',
    optimization: {
      ...configWithoutDevServer.optimization,
      splitChunks: {
        chunks: 'all',
      },
    },
  };
};
