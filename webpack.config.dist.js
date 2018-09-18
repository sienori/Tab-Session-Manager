/* Copyright (c) 2018 Kamil Mikosz 
 * Copyright (c) 2018 Sienori
 * Released under the MIT license.
 * see https://opensource.org/licenses/MIT */

const UglifyJsPlugin = require("uglifyjs-webpack-plugin");
const {
  getHTMLPlugins,
  getOutput,
  getCopyPlugins,
  getZipPlugin,
  getFirefoxCopyPlugins,
  getEntry
} = require("./webpack.utils");
const path = require("path");
const config = require("./config.json");
const CleanWebpackPlugin = require("clean-webpack-plugin");

const extVersion = require("./src/manifest.json").version;
const ffExtVersion = require("./src/manifest-ff.json").version;

const generalConfig = {
  mode: "production",
  resolve: {
    alias: {
      src: path.resolve(__dirname, "src/")
    }
  },
  module: {
    rules: [
      {
        loader: "babel-loader",
        exclude: /node_modules/,
        test: /\.(js|jsx)$/,
        query: {
          presets: [
            [
              "@babel/preset-env",
              {
                targets: {
                  firefox: 57
                }
              }
            ],
            "@babel/preset-react"
          ],
          plugins: ["transform-class-properties"]
        },
        resolve: {
          extensions: [".js", ".jsx"]
        }
      },
      {
        test: /\.scss$/,
        use: [
          {
            loader: "style-loader"
          },
          {
            loader: "css-loader"
          },
          {
            loader: "sass-loader"
          }
        ]
      },
      {
        test: /\.svg$/,
        use: [
          "babel-loader",
          {
            loader: "react-svg-loader",
            options: {
              svgo: {
                plugins: [{ removeTitle: false }],
                floatPrecision: 2
              }
            }
          }
        ]
      }
    ]
  }
};

module.exports = [
  {
    ...generalConfig,
    output: getOutput("chrome", config.tempDirectory),
    entry: getEntry(config.chromePath),
    plugins: [
      new CleanWebpackPlugin(["dist", "temp"]),
      new UglifyJsPlugin(),
      ...getHTMLPlugins("chrome", config.tempDirectory, config.chromePath),
      ...getCopyPlugins("chrome", config.tempDirectory, config.chromePath),
      getZipPlugin(`${config.extName}-for-chrome-${extVersion}`, config.distDirectory)
    ]
  },
  {
    ...generalConfig,
    output: getOutput("opera", config.tempDirectory),
    entry: getEntry(config.operaPath),
    plugins: [
      new CleanWebpackPlugin(["dist", "temp"]),
      new UglifyJsPlugin(),
      ...getHTMLPlugins("opera", config.tempDirectory, config.operaPath),
      ...getCopyPlugins("opera", config.tempDirectory, config.operaPath),
      getZipPlugin(`${config.extName}-for-opera-${extVersion}`, config.distDirectory)
    ]
  },
  {
    ...generalConfig,
    entry: getEntry(config.firefoxPath),
    output: getOutput("firefox", config.tempDirectory),
    plugins: [
      new CleanWebpackPlugin(["dist", "temp"]),
      new UglifyJsPlugin(),
      ...getHTMLPlugins("firefox", config.tempDirectory, config.firefoxPath),
      ...getFirefoxCopyPlugins("firefox", config.tempDirectory, config.firefoxPath),
      getZipPlugin(`${config.extName}-for-firefox-${ffExtVersion}`, config.distDirectory)
    ]
  }
];
