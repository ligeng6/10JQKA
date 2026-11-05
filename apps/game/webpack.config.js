const path = require('path');

module.exports = {
  mode: 'production',
  entry: './src/main.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'game.js',
    iife: true,
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@pokergame/core': path.resolve(__dirname, '../../packages/core/src'),
      '@pokergame/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'ts-loader',
          options: { transpileOnly: true },
        },
        exclude: /node_modules/,
      },
    ],
  },
  optimization: {
    minimize: true,
    splitChunks: false,
    runtimeChunk: false,
  },
  target: ['web', 'es5'],
};
