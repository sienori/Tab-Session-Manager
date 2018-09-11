/* Copyright (c) 2018 Kamil Mikosz 
 * Released under the MIT license.
 * see https://opensource.org/licenses/MIT */

const {
  getHTMLPlugins,
  getOutput,
  getCopyPlugins,
  getFirefoxCopyPlugins,
  getEntry
} = require("./webpack.utils");
const config = require("./config.json");

const generalConfig = {
  mode: "development",
  devtool: "source-map",
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
          ]
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
      ...getHTMLPlugins("chrome", config.devDirectory, config.chromePath),
      ...getCopyPlugins("chrome", config.devDirectory, config.chromePath)
    ]
  },
  {
    ...generalConfig,
    entry: getEntry(config.operaPath),
    output: getOutput("opera", config.devDirectory),
    plugins: [
      ...getHTMLPlugins("opera", config.devDirectory, config.operaPath),
      ...getCopyPlugins("opera", config.devDirectory, config.operaPath)
    ]
  },
  {
    ...generalConfig,
    entry: getEntry(config.firefoxPath),
    output: getOutput("firefox", config.devDirectory),
    plugins: [
      ...getFirefoxCopyPlugins("firefox", config.devDirectory, config.firefoxPath),
      ...getHTMLPlugins("firefox", config.devDirectory, config.firefoxPath)
    ]
  }
];
