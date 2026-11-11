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
 * SHARE LINKS AND PASSWORD AUTOFILL — one variable, the links host:
 *
 *   EXPO_PUBLIC_LINKS_HOST=go.ajalatrvl.com        production (the default)
 *   EXPO_PUBLIC_LINKS_HOST=dev-go.ajalatrvl.com    development
 *   EXPO_PUBLIC_LINKS_HOST=staging-go.ajalatrvl.com  staging / preview
 *
 * The app shares `https://<host>/posts/{id}` and `/users/{id}`
 * (src/core/config/links.ts; backend answers D3), and app/+native-intent.tsx
 * sends them to the post and profile screens. Here the same host becomes:
 *
 *   iOS: associated domains `applinks:<host>` (universal links) and
 *   `webcredentials:<host>` (iCloud Keychain offers to save the password after
 *   sign-up and sign-in). The host's apple-app-site-association lists
 *   "<TEAM_ID>.com.ajala.app" for both. Universal links need a paid Apple
 *   Developer team to sign the Associated Domains capability (EAS enables it on
 *   the App ID) — as Sign in with Apple above already does.
 *
 *   Android: an auto-verified intent filter for https://<host>/posts/* and
 *   /users/*, checked against the host's assetlinks.json (the signing key's
 *   SHA-256 must be listed there).
 *
 * The EXPO_PUBLIC_ prefix lets the JavaScript read it too, so a build shares the
 * same host it opens. Changing it needs a new native build.
 *
 * MAPS — the Explore map is react-native-maps drawing Google Maps on both
 * platforms. The keys are EAS environment variables (development, preview and
 * production); `npx eas-cli env:pull --environment development` writes them to the
 * gitignored .env.local for local builds:
 *
 *   GOOGLE_MAPS_IOS_API_KEY=<Maps SDK for iOS key, restricted to com.ajala.app>
 *   GOOGLE_MAPS_ANDROID_API_KEY=<Maps SDK for Android key, restricted to com.ajala.app>
 *
 * Android's Google Maps closes the app when it starts without a key, so a build
 * without one says so in `extra.googleMapsAndroid` and Explore shows a note in
 * place of the map. An iOS build without its key falls back to Apple Maps
 * (`extra.googleMapsIos`; src/core/maps/MapCanvas.tsx).
 *
 * PLACES — the API takes Google place ids and has no place search, so the app
 * calls Google's Places API (New) itself (src/core/places) with the same keys.
 * They are build-time variables, so the platform's key is copied into
 * `extra.placesKey` for the JavaScript (it is already in the binary for Maps).
 * The keys are app-restricted, so each request names the app in headers; on
 * Android that includes the signing key's SHA-1, which the app picks itself (the
 * debug key in development, the EAS upload key otherwise) unless
 * GOOGLE_ANDROID_CERT_SHA1 names another. "Places API (New)" must be enabled
 * on both keys in Google Cloud, and the Android key must list both SHA-1s.
 *
 *   GOOGLE_ANDROID_CERT_SHA1=<optional; colons are fine>
 *
 * PUSH NOTIFICATIONS — expo-notifications, with the app's own token (FCM on
 * Android, APNs on iOS), not Expo's push service. Adding or changing this needs
 * a new native build.
 *
 * iOS: the plugin adds the `aps-environment` entitlement (the App ID needs Push
 * Notifications, which EAS turns on with the profile). It says `production`:
 * EAS builds are signed for distribution (TestFlight, the App Store, ad hoc),
 * which use production APNs. It does not depend on where the build runs, since
 * the runtime version (below) is a fingerprint of this config. A local device
 * build that needs sandbox APNs sets APNS_MODE=development.
 *
 * Android: FCM needs the Firebase project's google-services.json for
 * `com.ajala.app`. It is not committed (.gitignore). Point GOOGLE_SERVICES_JSON
 * at it — for EAS, a "file" environment variable, whose value is the file's
 * path on the build machine. Without it the app builds and runs, and simply
 * has no push token on Android.
 *
 *   GOOGLE_SERVICES_JSON=./google-services.json
 *
 * OVER-THE-AIR UPDATES — expo-updates with EAS Update. Each build profile has
 * its own channel in eas.json (development, preview, production), so
 * `eas update --channel preview` reaches preview builds only. The runtime
 * version is the native code's fingerprint: an update only goes to builds with
 * the same native code, and anything native (a new module, a plugin, a key in
 * the binary) needs a new build instead. The app checks itself at launch and on
 * returning to the foreground, and shows "Updating Ajala" while it installs one
 * (src/features/app-update); expo-updates' own launch check is off.
 *
 * An update carries this config, `extra.placesKey` included, so publish with the
 * environment's variables:
 *
 *   npx eas-cli update --channel preview --environment preview --message "…"
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

  // Share links (see the header). Same default as src/core/config/links.ts.
  const linksHost = process.env.EXPO_PUBLIC_LINKS_HOST?.trim() || 'go.ajalatrvl.com';
  next = {
    ...next,
    ios: {
      ...next.ios,
      associatedDomains: [
        ...(next.ios?.associatedDomains ?? []),
        `applinks:${linksHost}`,
        `webcredentials:${linksHost}`,
      ],
    },
  };
  next = {
    ...next,
    android: {
      ...next.android,
      intentFilters: [
        ...(next.android?.intentFilters ?? []),
        {
          action: 'VIEW',
          autoVerify: true,
          data: [
            { scheme: 'https', host: linksHost, pathPrefix: '/posts/' },
            { scheme: 'https', host: linksHost, pathPrefix: '/users/' },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
  };

  const androidMapsKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY;
  const iosMapsKey = process.env.GOOGLE_MAPS_IOS_API_KEY;
  next = {
    ...next,
    extra: {
      ...next.extra,
      googleMapsAndroid: Boolean(androidMapsKey),
      googleMapsIos: Boolean(iosMapsKey),
      // Places (see the header). Null without a key: place search then says it isn't available.
      placesKey: { ios: iosMapsKey || null, android: androidMapsKey || null },
      // Only when set: an unset value written as null was embedded as {} in the builds,
      // which the app then failed on (every Android place search said "isn't available").
      ...(process.env.GOOGLE_ANDROID_CERT_SHA1?.trim()
        ? { placesAndroidCert: process.env.GOOGLE_ANDROID_CERT_SHA1.trim() }
        : null),
    },
    plugins: [
      ...(next.plugins ?? []),
      ['react-native-maps', { androidGoogleMapsApiKey: androidMapsKey, iosGoogleMapsApiKey: iosMapsKey }],
    ],
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
          // Fixed, not read from EAS_BUILD: the runtime version is a fingerprint of this
          // config, and a value that differs between a laptop and EAS makes every
          // update published from the laptop miss the builds. Distribution builds use
          // production APNs; a local device build that needs sandbox sets APNS_MODE.
          mode: process.env.APNS_MODE === 'development' ? 'development' : 'production',
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

  // Over-the-air updates (see the header). The project id is app.json's EAS project.
  const projectId = next.extra?.eas?.projectId;
  if (projectId) {
    next = {
      ...next,
      runtimeVersion: { policy: 'fingerprint' },
      updates: {
        ...next.updates,
        url: `https://u.expo.dev/${projectId}`,
        // The app asks itself, so it can show that an update is installing.
        checkAutomatically: 'NEVER',
        fallbackToCacheTimeout: 0,
      },
    };
  }

  return next;
};
