module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // "expo-router/babel",  <-- Is line ko hata dein ya comment kar dein
      "nativewind/babel", "react-native-reanimated/plugin"
    ],
  };
};