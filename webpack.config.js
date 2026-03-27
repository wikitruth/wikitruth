const path = require('path');
const webpack = require('webpack');

let BundleAnalyzerPlugin = null;
try {
  BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
} catch {
  BundleAnalyzerPlugin = null;
}

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  const assetPrefixRaw = process.env.CDN_ASSET_PREFIX || '/dist/';
  const assetPrefix = assetPrefixRaw.endsWith('/') ? assetPrefixRaw : `${assetPrefixRaw}/`;
  const shouldAnalyzeBundle = process.env.ANALYZE_BUNDLE === 'true';
  const plugins = [
    new webpack.DefinePlugin({
      'process.env.REACT_APP_API_BASE_URL': JSON.stringify(process.env.REACT_APP_API_BASE_URL || '/api'),
      'process.env.REACT_APP_ERROR_REPORT_ENDPOINT': JSON.stringify(process.env.REACT_APP_ERROR_REPORT_ENDPOINT || ''),
      'process.env.REACT_APP_ENVIRONMENT': JSON.stringify(process.env.REACT_APP_ENVIRONMENT || (isProduction ? 'production' : 'development')),
    }),
  ];

  if (shouldAnalyzeBundle && BundleAnalyzerPlugin) {
    plugins.push(
      new BundleAnalyzerPlugin({
        analyzerMode: 'static',
        openAnalyzer: false,
        reportFilename: path.resolve(__dirname, 'public/dist/bundle-report.html'),
        generateStatsFile: true,
        statsFilename: path.resolve(__dirname, 'public/dist/bundle-stats.json'),
      })
    );
  }

  return {
    entry: {
      bundle: './client/index.tsx',
    },
    output: {
      path: path.resolve(__dirname, 'public/dist'),
      filename: '[name].js',
      chunkFilename: '[name].chunk.js',
      publicPath: assetPrefix,
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          exclude: /node_modules/,
          include: path.resolve(__dirname, 'client'),
          use: {
            loader: 'ts-loader',
          },
        },
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          include: path.resolve(__dirname, 'client'),
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env', '@babel/preset-react', '@babel/preset-typescript'],
            },
          },
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
        {
          test: /\.(png|jpe?g|gif|svg|webp)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'assets/images/[name][ext]',
          },
        },
        {
          test: /\.(woff2?|eot|ttf|otf)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'assets/fonts/[name][ext]',
          },
        },
      ],
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
    },
    plugins: plugins,
    devtool: 'source-map',
    mode: isProduction ? 'production' : 'development',
    devServer: {
      static: {
        directory: path.resolve(__dirname, 'public'),
      },
      compress: true,
      hot: true,
      port: 3001,
      historyApiFallback: {
        index: '/react-app.html',
      },
      devMiddleware: {
        publicPath: '/dist/',
      },
      client: {
        overlay: true,
      },
      proxy: [
        {
          context: ['/api'],
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
        {
          context: ['/login', '/signup', '/logout', '/account', '/fast-switch'],
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
      ],
    },
  };
};
