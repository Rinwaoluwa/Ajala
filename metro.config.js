const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// global.css is generated from the token contract — see scripts/generate-theme-css.js.
module.exports = withNativeWind(config, { input: './global.css' });
