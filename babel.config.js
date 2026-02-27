module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      "nativewind/babel",
      // "expo-router/babel" a été supprimé car il est inclus dans babel-preset-expo depuis le SDK 50
    ],
  };
};