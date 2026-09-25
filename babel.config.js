/**
 * Reanimated 4 ships its worklets plugin as `react-native-worklets/plugin`, and it
 * must stay LAST in the plugin list — anything appended after it silently breaks
 * worklet transforms.
 */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: ['react-native-worklets/plugin'],
  };
};
