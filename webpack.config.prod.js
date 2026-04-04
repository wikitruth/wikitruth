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
      runtimeChunk: false,
      moduleIds: 'deterministic',
      splitChunks: {
        // Keep initial app bootstrap in bundle.js so public/react-app.html
        // can serve modern client without additional hardcoded script tags.
        chunks: 'async',
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
