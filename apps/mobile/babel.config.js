module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            '@crumb/core': '../../packages/core/src',
            '@crumb/storage': '../../packages/storage/src',
            '@crumb/splitwise': '../../packages/splitwise/src',
          },
        },
      ],
    ],
  }
}
