module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'nativewind/babel',
      // Reanimated doit TOUJOURS être le dernier plugin
      'react-native-reanimated/plugin',
    ],
  };
};