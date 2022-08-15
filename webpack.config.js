const path = require('path');
const ReactRefreshPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

const isDevelopment = process.env.NODE_ENV !== 'production';

module.exports = (env) => {
const isWeb = env.ACTIVE_ENV === 'web'
console.log('---',isWeb)
  return {
  mode: isDevelopment ? 'development' : 'production',
  devServer: {
    client: { overlay: false },
  },
  entry: "./src/hoge.tsx",
  output: {
    //  出力ファイルのディレクトリ名
    path: `${__dirname}/out`,
    // 出力ファイル名
    filename: "hoge.js"
  },
    module: {
      rules: [
        {
          // 拡張子 .ts もしくは .tsx の場合
          test: /\.tsx?$/,
          // TypeScript をコンパイルする
          use: "babel-loader",
        },
        {
          test: /\.css/,
          use: [
            "style-loader",
            {
              loader: "css-loader",
              options: { url: false }
            }
          ]
        }
      ]
    },
  plugins: [
    isWeb ? new webpack.DefinePlugin({
      files: [
        {
          webViewUriString: '"dummy1"',
          webViewUri: {
            path: '"dummy1"'
          },
        },
        {
          webViewUriString: '"dummy2"',
          webViewUri: {
            path: '"dummy2"'
          },
        },
      ],
      acquireVsCodeApi: () => undefined,
      isWeb: true
    }): new webpack.DefinePlugin({
      isWeb: false
    }),
    isDevelopment && new ReactRefreshPlugin(),
    new ForkTsCheckerWebpackPlugin(),
    isWeb && new HtmlWebpackPlugin({
      filename: './index.html',
      template: './public/index.html',
    }),
  ].filter(Boolean),
  resolve: {
    extensions: ['.js', '.ts', '.tsx'],
  },
}};
