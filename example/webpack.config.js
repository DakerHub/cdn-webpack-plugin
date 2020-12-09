const path = require('path');
const CDNWebpackPlugin = require('./../index');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const { CDNBase } = process.env;
const output = path.resolve(__dirname, 'dist');

module.exports = {
  entry: path.resolve(__dirname, 'app.js'),
  output: {
    path: output,
    filename: 'bundle.js',
    publicPath: `${CDNBase}/test/[hash]`,
  },
  plugins: [
    new CleanWebpackPlugin(),
    new CDNWebpackPlugin({
      getPath: (hash) => `test/${hash}`,
    }),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'index.html'),
    }),
  ],
};
