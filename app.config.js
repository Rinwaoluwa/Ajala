/**
 * Build-time additions to app.json.
 *
 * Google Sign-In's config plugin registers the iOS client's reversed id as a URL
 * scheme, and it refuses to build without one. That id belongs to the Google
 * Cloud project the API verifies tokens against, so it comes from the
 * environment rather than being committed. Without it the plugin is left out:
 * the app still builds and the Google button says sign-in is not available.
 *
 *   GOOGLE_IOS_URL_SCHEME=com.googleusercontent.apps.<ios-client-id-prefix>
 *
 * SIGN IN WITH APPLE — DISABLED until there is a paid Apple Developer account.
 * The capability it adds (`com.apple.developer.applesignin`) cannot be signed by
 * a free personal team, so it stops the build. The package also applies that
 * capability by itself whenever it is installed, so it has been uninstalled.
 * To turn it back on: `npx expo install expo-apple-authentication`, uncomment the
 * block below, uncomment the code in
 * `src/features/auth/data/datasources/native/appleIdentity.ts`, and rebuild
 * (`npx expo prebuild --platform ios --clean`).
 */
module.exports = ({ config }) => {
  // Xcode 26 rejects expo-modules-core 57.0.23 in Swift 6 mode; see the plugin.
  let next = {
    ...config,
    plugins: [...(config.plugins ?? []), './plugins/withSwift5ExpoModulesCore'],
  };

  // next = {
  //   ...next,
  //   ios: { ...next.ios, usesAppleSignIn: true },
  //   plugins: [...(next.plugins ?? []), 'expo-apple-authentication'],
  // };

  const iosUrlScheme = process.env.GOOGLE_IOS_URL_SCHEME;
  if (iosUrlScheme) {
    next = {
      ...next,
      plugins: [...(next.plugins ?? []), ['@react-native-google-signin/google-signin', { iosUrlScheme }]],
    };
  }

  return next;
};
