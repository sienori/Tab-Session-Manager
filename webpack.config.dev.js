/* Copyright (c) 2018 Kamil Mikosz
 * Released under the MIT license.
 * see https://opensource.org/licenses/MIT */

const {
  getHTMLPlugins,
  getOutput,
  getCopyPlugins,
  getFirefoxCopyPlugins,
  getMiniCssExtractPlugin,
  getBufferPlugin,
  getEntry
} = require("./webpack.utils");
const path = require("path");
const config = require("./config.json");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const generalConfig = {
  mode: "development",
  devtool: "source-map",
  resolve: {
    alias: {
      src: path.resolve(__dirname, "src/")
    },
    fallback: {
      url: require.resolve("url/")
    }
  },
  module: {
    rules: [
      {
        loader: "babel-loader",
        exclude: /node_modules/,
        test: /\.(js|jsx)$/,
        resolve: {
          extensions: [".js", ".jsx"]
        }
      },
      {
        test: /\.scss$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader
          },
          {
            loader: "css-loader",
            options: {
              esModule: false
            }
          },
          {
            loader: "sass-loader"
          }
        ]
      },
      {
        test: /\.svg$/,
        use: ["@svgr/webpack"]
      }
    ]
  }
};

module.exports = [
  {
    ...generalConfig,
    entry: getEntry(config.chromePath),
    output: getOutput("chrome", config.devDirectory),
    plugins: [
      ...getMiniCssExtractPlugin(),
      ...getHTMLPlugins("chrome", config.devDirectory, config.chromePath),
      ...getCopyPlugins("chrome", config.devDirectory, config.chromePath),
      ...getBufferPlugin()
    ]
  },
  {
    ...generalConfig,
    entry: getEntry(config.firefoxPath),
    output: getOutput("firefox", config.devDirectory),
    plugins: [
      ...getMiniCssExtractPlugin(),
      ...getFirefoxCopyPlugins("firefox", config.devDirectory, config.firefoxPath),
      ...getHTMLPlugins("firefox", config.devDirectory, config.firefoxPath),
      ...getBufferPlugin()
    ]
  }
];
