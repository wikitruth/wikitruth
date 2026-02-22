const baseConfigFactory = require('./webpack.config');

module.exports = (env = {}, argv = {}) => {
  const baseConfig = baseConfigFactory(env, { ...argv, mode: 'production' });
  const { devServer, ...configWithoutDevServer } = baseConfig;

  return {
    ...configWithoutDevServer,
    mode: 'production',
    cache: {
      type: 'filesystem',
    },
    optimization: {
      ...configWithoutDevServer.optimization,
      runtimeChunk: 'single',
      moduleIds: 'deterministic',
      splitChunks: {
        chunks: 'all',
        maxInitialRequests: 20,
        minSize: 20_000,
      },
    },
    performance: {
      hints: 'warning',
      maxEntrypointSize: 500_000,
      maxAssetSize: 500_000,
    },
  };
};
