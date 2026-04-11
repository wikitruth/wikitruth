const baseConfigFactory = require('./webpack.config');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = (env = {}, argv = {}) => {
  const baseConfig = baseConfigFactory(env, { ...argv, mode: 'production' });
  const { devServer, ...configWithoutDevServer } = baseConfig;

  const plugins = [...(configWithoutDevServer.plugins || [])];
  if (process.env.ANALYZE_BUNDLE) {
    plugins.push(new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false,
      reportFilename: 'bundle-report.html',
    }));
  }

  return {
    ...configWithoutDevServer,
    mode: 'production',
    plugins,
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
