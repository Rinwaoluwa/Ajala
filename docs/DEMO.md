# Demo mode

Run the whole app with realistic data and no backend — for UI testing, design review and demos.

```bash
npm run demo        # Metro with EXPO_PUBLIC_DEMO=1, then open the installed dev build
```

It needs the native dev build already on the phone or simulator (`npx expo run:ios`). The flag
is read when the bundle is built, so switch modes by restarting Metro (`npm run demo` /
`npm start`), not by reloading.

## How it works

`apiRequest` (`src/core/api/apiClient.ts`) hands every request to `src/core/demo/demoApi.ts`
instead of the network. Each feature's real repositories, mappers and caches run unchanged against
answers shaped exactly like the API's (docs/api spec §6). Nothing is sent anywhere.

State lives in memory while the app runs and starts again on restart.

## What you can do

| Try | What happens |
| --- | --- |
| Sign in with **any email and password** | Ada Obi, a finished profile in Lagos |
| Sign up | Any 6-digit code verifies it; profile setup follows |
| Home feed | 12 posts in Lagos (meetups, events, plans, groups); filters by type |
| "+" → any type → Publish | Validates like the API (2–4 photos, interests, future start, a pin for Meetups and Events, a link for a paid Event); the post then shows on the feed and the map |
| Save draft | Saved; later saves and Publish update the same post |
| Explore map | Pins across Lagos; type chips, "Happening today", search any demo city |
| Tap a pin → RSVP | Coffee & Chat: going. Lagos Tech Founders: requested (private). Afrobeats After Hours: paid, opens its booking link. Sunset Yoga Circle: full → waitlisted |
| ⋯ → Report activity | Filed; reporting the same post again says it is already reported |
| Google / Apple sign-in | Not in the demo — use email |

## Stakeholder builds

The `preview` profile in `eas.json` builds the demo into an installable app (Expo project
`@ajalatrvl/ajala`, in the Ajalatrvl organisation):

```bash
eas build -p android --profile preview                  # an APK, installed from the build's page or QR code
eas build -p ios --profile preview --auto-submit        # signed for the App Store, then sent to TestFlight
```

iOS needs a paid Apple Developer account: the first run asks you to sign in to Apple, then creates the
certificates and the App Store Connect app. Testers are invited in App Store Connect → TestFlight.

A demo build stands the phone in Victoria Island, Lagos (`src/core/location/deviceLocation.ts`), so it
shows the demo posts wherever it is tested.

## Location

The demo always reports Victoria Island, Lagos as the phone's location, where its posts are, so
there is no need to set the simulator's location. To look at other cities, search for them on the map.

## Not covered

Travel Pro is always off (there is no subscription API to fake). Photos and avatars load from
public placeholder services, so a connection is still needed for images.
