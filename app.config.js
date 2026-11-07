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
 * SIGN IN WITH APPLE — on. `expo-apple-authentication` adds the
 * `com.apple.developer.applesignin` entitlement, which needs a paid Apple
 * Developer team: the App ID `com.ajala.app` must have "Sign In with Apple"
 * enabled (EAS turns it on when it makes the provisioning profile). A free
 * personal team cannot sign it. On Android the button is hidden.
 *
 * PASSWORD AUTOFILL (iOS) — set IOS_WEBCREDENTIALS_DOMAIN to the domain whose
 * `/.well-known/apple-app-site-association` lists this app under
 * `webcredentials.apps` ("<TEAM_ID>.com.ajala.app"). iCloud Keychain then offers
 * to save the password after sign-up and sign-in, and suggests strong ones.
 * Off by default: a free personal team cannot sign the Associated Domains
 * capability.
 *
 *   IOS_WEBCREDENTIALS_DOMAIN=ajalatrvl.com
 *
 * MAPS — the Explore map is react-native-maps: Apple Maps on iOS, which needs no
 * key, and Google Maps on Android, which does. Google Maps closes the app when it
 * starts without a key, so a build without one says so in `extra.googleMapsAndroid`
 * and Explore shows a note in place of the map (src/core/maps/MapCanvas.tsx).
 * For EAS builds, set it as an EAS environment variable, not only in .env:
 *
 *   GOOGLE_MAPS_ANDROID_API_KEY=<Maps SDK for Android key, restricted to com.ajala.app>
 *
 * PUSH NOTIFICATIONS — expo-notifications, with the app's own token (FCM on
 * Android, APNs on iOS), not Expo's push service. Adding or changing this needs
 * a new native build.
 *
 * iOS: the plugin adds the `aps-environment` entitlement (the App ID needs Push
 * Notifications, which EAS turns on with the profile). EAS builds are signed
 * for distribution (TestFlight, the App Store, ad hoc), which use production
 * APNs, so they say `production`; a local `expo run:ios` build says
 * `development` and gets sandbox tokens. The API must send each to the matching
 * APNs environment.
 *
 * Android: FCM needs the Firebase project's google-services.json for
 * `com.ajala.app`. It is not committed (.gitignore). Point GOOGLE_SERVICES_JSON
 * at it — for EAS, a "file" environment variable, whose value is the file's
 * path on the build machine. Without it the app builds and runs, and simply
 * has no push token on Android.
 *
 *   GOOGLE_SERVICES_JSON=./google-services.json
 */
module.exports = ({ config }) => {
  // Xcode 26 rejects expo-modules-core 57.0.23 in Swift 6 mode; see the plugin.
  let next = {
    ...config,
    plugins: [...(config.plugins ?? []), './plugins/withSwift5ExpoModulesCore'],
  };

  next = {
    ...next,
    ios: { ...next.ios, usesAppleSignIn: true },
    plugins: [...(next.plugins ?? []), 'expo-apple-authentication'],
  };

  const webCredentialsDomain = process.env.IOS_WEBCREDENTIALS_DOMAIN;
  if (webCredentialsDomain) {
    next = {
      ...next,
      ios: {
        ...next.ios,
        associatedDomains: [...(next.ios?.associatedDomains ?? []), `webcredentials:${webCredentialsDomain}`],
      },
    };
  }

  const mapsKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY;
  next = {
    ...next,
    extra: { ...next.extra, googleMapsAndroid: Boolean(mapsKey) },
    plugins: [...(next.plugins ?? []), ['react-native-maps', { androidGoogleMapsApiKey: mapsKey }]],
  };

  // The small icon is the "A" mark from the adaptive monochrome icon, white on
  // clear as Android requires; the colour tints it. `default` is the channel the
  // app creates (src/core/push/pushNotifications.ts).
  next = {
    ...next,
    plugins: [
      ...(next.plugins ?? []),
      [
        'expo-notifications',
        {
          icon: './assets/images/notifications/notification-icon.png',
          color: '#0E6F69',
          defaultChannel: 'default',
          mode: process.env.EAS_BUILD ? 'production' : 'development',
        },
      ],
    ],
  };

  const googleServicesFile = process.env.GOOGLE_SERVICES_JSON;
  if (googleServicesFile) {
    next = { ...next, android: { ...next.android, googleServicesFile } };
  }

  const iosUrlScheme = process.env.GOOGLE_IOS_URL_SCHEME;
  if (iosUrlScheme) {
    next = {
      ...next,
      plugins: [...(next.plugins ?? []), ['@react-native-google-signin/google-signin', { iosUrlScheme }]],
    };
  }

  return next;
};
