import { defineConfig, type UserConfigExport } from '@tarojs/cli';
import path from 'path';

export default defineConfig<'weapp'>(async (merge) => {
  const packagesDir = path.resolve(__dirname, '../../../packages');

  const baseConfig: UserConfigExport<'weapp'> = {
    projectName: 'pokergame',
    date: '2026-11-3',
    designWidth: 750,
    deviceRatio: {
      640: 2.34 / 2,
      750: 1,
      375: 2,
      828: 1.81 / 2,
    },
    sourceRoot: 'src',
    outputRoot: 'dist',
    plugins: [],
    defineConstants: {},
    copy: {
      patterns: [],
      options: {},
    },
    framework: 'react',
    compiler: 'webpack5',
    cache: {
      enable: false,
    },
    mini: {
      postcss: {
        pxtransform: {
          enable: true,
          config: {},
        },
        cssModules: {
          enable: false,
        },
      },
      webpackChain(chain) {
        chain.module
          .rule('packages-ts')
          .test(/\.tsx?$/)
          .include.add(packagesDir)
          .end()
          .use('babel-loader')
          .loader(require.resolve('babel-loader'))
          .options({
            babelrc: false,
            configFile: false,
            presets: [
              [require.resolve('@babel/preset-env'), { targets: { chrome: '53' } }],
              [require.resolve('@babel/preset-react'), { runtime: 'automatic' }],
            ],
            plugins: [
              require.resolve('@babel/plugin-transform-typescript'),
            ],
          });
      },
    },
    h5: {
      publicPath: '/',
      staticDirectory: 'static',
      output: {
        filename: 'js/[name].[hash:8].js',
        chunkFilename: 'js/[name].[chunkhash:8].js',
      },
      miniCssExtractPluginOption: {
        ignoreOrder: true,
        filename: 'css/[name].[hash].css',
        chunkFilename: 'css/[name].[chunkhash].css',
      },
      postcss: {
        autoprefixer: {
          enable: true,
          config: {},
        },
        cssModules: {
          enable: false,
        },
      },
    },
  };
  return merge({}, baseConfig);
});
