# core/places — Google places for the pickers

The API takes Google place ids (home place, favourite destinations, a post's place, teleport) and
has no place search of its own (spec §1.6). This module finds them, through plain functions:

| Function                             | Answers                                                               | Google call                                                                                     |
| ------------------------------------ | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `searchCities(text, near?, signal?)` | `PlaceSuggestion[]`: cities only                                      | Autocomplete with `includedPrimaryTypes: ['(cities)']`                                          |
| `searchPlaces(text, near?, signal?)` | `PlaceSuggestion[]`: venues, areas, cities; `near` ranks nearby first | Autocomplete                                                                                    |
| `placeDetails(placeId, signal?)`     | `PlaceDetails { placeId, name, address, lat, lng }`; ends the session | Place Details, field mask `id,displayName,formattedAddress,location`                            |
| `cityAt(lat, lng)`                   | `CityRef { placeId, name }` or null: "detect my city"                 | the phone's geocoder (`expo-location`) names the city, then a cities search biased to the point |
| `endPlacesSession()`                 | —                                                                     | drops the session token when a picker closes without `placeDetails`                             |

Every failure is a `PlacesError` with `kind`:

- `unavailable`: no key in this build, Google answered with an error, or the geocoder failed;
- `network`: offline or timed out (8 s);
- `denied`: Google refused the key (API not enabled, or the app restriction doesn't match).

All three can read as "Place search isn't available right now". A caller cancelling (`signal`)
gets its own abort error back, not a `PlacesError`.

## Keys

The platform's Maps key (`GOOGLE_MAPS_IOS_API_KEY`, `GOOGLE_MAPS_ANDROID_API_KEY`), copied by
`app.config.js` into `extra.placesKey` at build time. The keys are app-restricted, so each request
names the app: `X-Ios-Bundle-Identifier: com.ajala.app` on iOS; `X-Android-Package: com.ajala.app`
and `X-Android-Cert: <SHA-1>` on Android (the debug key in a development bundle, the EAS upload key
otherwise, or `GOOGLE_ANDROID_CERT_SHA1`).

**In Google Cloud, enable "Places API (New)" on both keys** (an API restriction that lists only the
Maps SDKs refuses every call with 403, which reads here as `denied`). The Android key's app
restriction must list both SHA-1s:

- EAS upload key `F3:4F:CF:95:1A:33:CA:08:7B:2C:F8:B5:1A:4B:59:89:D1:85:3B:87`
- debug key `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`

No Geocoding web service: it does not take app-restricted keys, which is why `cityAt` names the
city on the phone first.

## Sessions

Autocomplete is billed per session when the keystrokes and the Place Details call that ends the
search share a token. The module keeps one token (one picker is open at a time), starts a new one
after three idle minutes, and ends it on `placeDetails` or `endPlacesSession()`.
