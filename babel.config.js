module.exports = {
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
  plugins: [
    "@babel/plugin-proposal-optional-chaining",
    "@babel/plugin-proposal-object-rest-spread",
    "@babel/plugin-transform-class-properties"
  ]
};
