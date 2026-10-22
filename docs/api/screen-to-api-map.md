# AJALA Mobile: Screen to API Map

Oct 10, 2026 · @Adeboye oyelola

## How to use this document

Every screen in the AJALA Figma file is listed below with the API calls it needs. Where a screen has no API yet, it is listed in the last section so you can build it behind a flag or leave it for later.

| Thing | Value |
| :---- | :---- |
| Base URL | `https://<api host>/api/v1` (the host is shared separately per environment) |
| Auth header | `Authorization: Bearer <accessToken>` on every call except sign-up, sign-in, forgot password, app config and the deep-link files |
| Access token | Lives 15 minutes. On a 401, call POST /auth/refresh with the refresh token and retry once |
| Refresh token | Lives 7 days idle, 30 days absolute. It rotates on every refresh: always store the new pair. Reusing an old one signs the session out |
| Location header | `X-Client-Location: <lat>,<lng>` when the app has location permission. Send it on feed, map, explore, post detail and profile grids. It picks the feed city and fills distanceKm on cards |
| Error body | `{ code, message, errors?, requestId }`. code is a stable string such as POST_FULL; errors carries per-field messages on a 400 |
| Lists | Cursor based: send cursor and limit, read nextCursor from the answer; null means the end |
| Post types | meetup, event, plan, group. The feed, map and create wizard all use these four strings |
| Full reference | The Postman collection is generated from the API's Swagger document and has every request body, response example and error code. Multi-step flows are explained in the request descriptions there |

The backend decides state. The app never computes whether a post is full, whether a user is verified or whether a draft can publish: it sends the call and shows the answer or the error.

## 1. Onboarding and sign up

Sign-up is three calls: create the account, verify the emailed code, then set up the profile with PATCH /me. Google and Apple skip the code step.

| Figma screen | What happens | API call | Notes |
| :---- | :---- | :---- | :---- |
| Splash, Onboarding slides (Passport, Build Your Journey, Badges) | App launch | GET /app/config (public) | Gives termsVersion, minAppVersion.ios / .android, terms and privacy URLs, support email. Show a force-update screen when the build is older than minAppVersion |
| Sign Up Option: Apple | Native Sign in with Apple | POST /auth/oauth/apple { identityToken, authorizationCode, nonce, firstName?, lastName?, termsVersion, deviceId, deviceName, timezone } | Returns the token pair, user and isNew. Apple gives the name only on the first authorisation, so always pass it when you have it |
| Sign Up Option: Google | Native Google sign-in | POST /auth/oauth/google { idToken, nonce, termsVersion, deviceId, deviceName, timezone } | Same answer shape as Apple |
| Both OAuth buttons: email already has an account | 409 ACCOUNT_LINK_REQUIRED with details.challengeId; a 6-digit code is emailed to that account | POST /auth/oauth/link { challengeId, code } | Returns the token pair. No screen exists for this in Figma yet: reuse the Verification screen |
| Create Account (email, full name, date of birth, password) | Proceed | POST /auth/signup/email { email, password, firstName, lastName, dob, termsVersion, timezone? } → 202 | The API needs firstName and lastName; the design has one Full Name field, so split on the first space or ask the designer for two fields. dob is YYYY-MM-DD. Password rule: 8 to 128 characters, one uppercase, one digit, and not a known breached password (400 on password) |
| Email Verification (6-digit code) | Verify Code | POST /auth/otp/verify { target: <email>, code, deviceId, deviceName, timezone } | Returns { accessToken, refreshToken, accessExpiresAt, sessionId, user, isNew }. Store both tokens in secure storage |
| Email Verification: resend | Resend code | POST /auth/otp/resend { target: <email> } → 202 | Capped at 3 per hour per address; a 429 means wait |
| Email verification failure sheet | Retry verification | same as resend | Wrong code is a 400; expired code is a 400 too, so resend |
| Email verified modal | Continue | GET /me | Route on the answer: profileCompletedAt null → Profile Setup; termsUpToDate false → show terms; otherwise Home |
| Any sign-up or sign-in success (still in works) | After tokens are stored | POST /me/devices { token, platform, appInstanceId?, timezone, deviceId } | Registers the push token. Do this once per sign-in and again whenever the push token changes |

deviceId is a stable id you generate once per install and keep. Send the same value on sign-in, on the device registration and on sign-out, so a password change elsewhere can keep this phone's push token.

## 2. Sign in and forgot password

Sign-in is one call. Forgot password is two, and the reset step arrives by an emailed link, not a code: see the note on the Verification screen below.

| Figma screen | What happens | API call | Notes |
| :---- | :---- | :---- | :---- |
| Sign In Option | Apple / Google / Email | the same two OAuth calls as sign-up | One endpoint serves sign-up and sign-in; isNew tells you which happened |
| Sign In (email, password) | Sign In | POST /auth/login { email, password, deviceId, deviceName, timezone } | Returns the token pair and user. 401 wrong email or password. After repeated failures the account is locked for a while and the API still answers 401, so the message stays "wrong email or password" |
| Sign In: step-up | 403 STEP_UP_REQUIRED | POST /auth/login { email, password, otpCode, deviceId, deviceName } | The API emailed a 6-digit code because the sign-in looked unusual. Show the Verification screen and resend the same login with otpCode. Not in Figma yet |
| Sign In: account pending deletion | Sign-in succeeds | none extra | Signing in within 14 days of a delete request cancels the deletion. Show a short notice |
| Forgot Password (email) | Send Verification Code | POST /auth/password/forgot { email } → 202 | Always 202, even for an unknown email, so the screen cannot tell the user whether the address exists |
| Password Reset: Verification (6-digit code) | Verify Code | no call | The API sends an email with a reset link that opens the app, not a code. The link carries a token that lives 15 minutes. Handle the deep link and open Create New Password with that token. The code screen in Figma does not match the backend: see section 12 |
| Create New Password | Reset Password | POST /auth/password/reset { token, newPassword } → 204 | Signs out every device. Same password rule as sign-up |
| Password Reset Successful modal | Sign In | back to Sign In |  |
| Any screen, token expired | 401 on a call | POST /auth/refresh { refreshToken } | Returns a new pair. If refresh itself fails, go to Sign In Option |
| Settings: Log out | Log out | POST /me/devices/unregister { token } then POST /auth/logout → 204 | Unregister the push token first so the phone stops receiving pushes for that account |
| Account & security: sign out everywhere | not in Figma | POST /auth/logout/all → 204 | Ends every session including this one |

## 3. Profile setup after sign up

All four setup screens write to the same PATCH /me. Send one PATCH per step, or collect everything and send one at the end; the API accepts any subset of fields. The profile counts as complete once first name, last name, date of birth and gender are all present, which is what makes GET /me return profileCompletedAt.

| Figma screen | Element | API call | Notes |
| :---- | :---- | :---- | :---- |
| Display Name | the @username | GET /handles/availability?handle= while typing, then PATCH /me { handle } | Availability answers { available, reason: taken, reserved, format, null }. It is throttled to 10 per minute, so debounce by about 600 ms. The PATCH answers 409 CONFLICT if taken and 409 HANDLE_COOLDOWN with availableAt if the user changed it recently |
| Profile Setup: Basic Details | Add profile photo | POST /me/avatar (multipart, field file) → { avatarUrl } | JPEG, PNG or WebP, up to 5 MB. 413 too large, 415 not an image. DELETE /me/avatar removes it |
| Profile Setup: Basic Details | Current city (auto-detected) | GET /cities/resolve?lat=&lng= → { city, distanceKm } then PATCH /me { homeCityId: city.id } | Without location permission, let the user search instead: GET /cities?q=lon&limit=10 |
| Profile Setup: Basic Details | Languages spoken | PATCH /me { extras: { languages: ['en', 'es'] } } | ISO 639-1 two-letter codes, up to 10. The chips in Figma map to codes on the client |
| Profile Setup: Basic Details | Gender (not drawn) | PATCH /me { gender } | Required for profile completion. The design has no gender field: ask the designer, or default and let the user edit later |
| Profile Setup: Travel Style | the style chips | no matching field today | The closest field is extras.lookingTo, a fixed list of six reasons (meet locals, meet travellers, find a travel buddy, host events, explore food and nightlife, practise a language). The 40 style chips are not in the backend: see section 12 |
| Travel Interests ("What are you into?") | the interest chips | GET /interests for the list, then PATCH /me { interestIds: [...] } | The list comes from the server with id, slug, name and emoji. The API accepts 3 to 8; the screen says 5 to 8, so enforce 5 on the client if that is the product rule. Skip is allowed |
| Profile Setup: Favourite Locations | the city chips and search | no matching field today | The search box can use GET /cities?q=, but there is nowhere to save favourites. See section 12. Dated trips are a different feature: POST /me/trips { cityId, arrivesOn, leavesOn } shows as "visiting" on the profile |
| Loading screen after setup | Loading | GET /me | Confirms profileCompletedAt and gives the home city for the feed |

## 4. Home feed

The feed is one call. The city is chosen by the server from the location header, then the network location, then the home city; the app never sends a city id.

| Figma screen | Element | API call | Notes |
| :---- | :---- | :---- | :---- |
| Home Feed | the card list | GET /feed?type=all&limit=20 with X-Client-Location: lat,lng | Answer: { city, citySource, items, nextCursor }. items are post cards: id, type, title, images (thumb, card, full URLs), startAt, placeName, city, capacity, goingCount, rsvpState, price, host (name, avatar, verified), interests, distanceKm. Page with cursor=nextCursor |
| Home Feed | city name in the header ("Lagos") | from the feed answer | city.name and citySource (device, edge or home). Show the name; citySource is useful on a debug screen |
| Home Feed | filter chips | GET /feed?type=meetup / event / plan / group | The backend filters by post type only. The chips in Figma (Activities, Trips, Events, Food) do not match: see section 12 for the mapping question |
| Home Feed / Skeleton | loading | same call | Show the skeleton until the first page lands |
| Home Feed | 404 NO_CITY | none | Only possible when the user skipped onboarding and has no home city and no location. Send them to set a home city |
| Home Feed | pull to refresh | same call without cursor | Cards are cached server-side for 10 minutes, so a brand-new post may take a moment to appear |
| Home Feed | tap a card | GET /posts/:postId | See section 6 |
| Home Feed | heart / save icon | no endpoint | See section 12 |
| Home Feed | Level, passport progress card | no endpoint | See section 12 |
| Choose City / Teleport sheet | city search | GET /cities?q= | Returns matching catalog cities. There is no way to point the feed at another city today, so this sheet can only show the current city. Teleport and the subscription are not built: see section 12 |
| Create Something modal | pick Meetup, Event, Plan or Group | none | Client-only. The choice becomes type in section 5 |

## 5. Create a Meetup, Event, Plan or Group

The whole wizard is one request. Collect every step locally and send a single POST /posts as multipart/form-data when the user taps Publish (with status=published) or Save draft (with status=draft). The four wizards in Figma differ only in type and in a few rules listed under the table.

| Wizard step | Figma element | Form field | Rules |
| :---- | :---- | :---- | :---- |
| Basic Details | Photos (2 to 4 required) | images (repeat the field, 0 to 4 files) | JPEG, PNG or WebP, 5 MB each. First file is the cover. A draft may have none; publishing needs 2 to 4 |
| Basic Details | Title | title | Up to 80 characters (the design says 100: use 80) |
| Basic Details | Description | description | Free text; needed to publish |
| Schedule | Date and Time | startAt | ISO 8601 with offset, for example 2026-10-22T18:00:00+01:00. Must be in the future to publish |
| Schedule | Meeting point | placeName, lat, lng | A Meetup or Event needs the pin to publish; a Plan or Group may skip it and takes the host's home city. Send lat and lng together. A place search needs a map SDK on the phone; the API only stores the result |
| Participants | Capacity ("10 people") | capacity | Optional. Event: over 100 or none. Group: 1 to 100. Meetup and Plan: any |
| Participants | Open to everyone / Request to join | visibility | open or private. Private means people request and the host accepts |
| Participants | Show on map | showOnMap | true or false as text |
| Participants | waiting list (not drawn) | waitlistEnabled | true lets people queue when full. Worth a toggle |
| Participants | Invite friends | no endpoint | See section 12 |
| Cost Sharing | Shared cost toggle, currency, amount | priceCents, currency | Both or neither. priceCents is in the smallest unit: NGN 60,000 is 6000000, USD 20 is 2000. currency is an upper-case ISO code. The "estimated split" is client-side maths |
| Cost Sharing | Expected travellers | none | Client-only input for the split estimate. It is not capacity |
| Cost Sharing | link to pay or book (not drawn) | externalUrl | https:// only, allowed only on a paid post. A paid Event cannot publish without one. Everyone sees it; the card then says joinMode: external |
| Review | interests (not drawn) | interestIds (repeat the field, 1 to 3 ids) | Required to publish. Pick from GET /interests. Missing from every wizard in Figma: see section 12 |
| Plan wizard only | checklist lines (not drawn) | checklist (repeat the field, up to 30 texts) | Plans only; a 400 on any other type |
| Review | Publish | status=published | 201 with the full post. Then show the Published / Success modal |
| Any step | Save draft | status=draft | 201. A draft needs only type and title. 20 drafts maximum (409 on the 21st) |

After a draft exists, edits go to PATCH /posts/:postId as JSON (any field but type and status; send null to clear), pictures to PUT /posts/:postId/images (multipart, the whole set in order), and publishing to POST /posts/:postId/publish.

Errors to handle on Publish:

* 400 VALIDATION_FAILED with an errors list naming every failed rule at once (date in the past, missing pin, fewer than 2 photos, no interests, Event capacity too low, paid Event without a link). Show them all on the Review step.
* 409 EVENT_MONTHLY_CAP: three Events per calendar month; details.resetsAt says when the cap resets. Show it in the error modal.
* 409 CONFLICT on the 21st draft.
* 413 image over 5 MB, 415 not an image.
* 403: the host is suspended.

## 6. Post detail, joining and attendees

Figma has no post detail screen yet; the Explore mini-card ("RSVP · Free", "27 joined · 13 left") is the closest. Every button on that card and on a future detail screen maps to the calls below.

| Element | API call | Notes |
| :---- | :---- | :---- |
| Open a post | GET /posts/:postId with X-Client-Location | The card fields plus description, status, checklist, isHost, rsvpState, waitlistPosition, canTickChecklist, linkClickCount (host only). 404 when the post is a draft of someone else, taken down, or the host blocked the viewer |
| Join button label | rsvpState and joinMode on the post | rsvpState is none, going, waitlisted, requested, declined or removed. joinMode is rsvp, or external on a paid Event, where the button opens externalUrl instead |
| Join / Request to join | POST /posts/:postId/rsvp → { state, goingCount, capacity, waitlistPosition } | Open post: going, or waitlisted when full and the waitlist is on. Private post: requested. 409 POST_FULL, POST_STARTED, POST_CANCELLED, EXTERNAL_BOOKING (paid Event: open the link) |
| Leave / cancel request | DELETE /posts/:postId/rsvp → 204 | Frees the spot and promotes the next waitlisted person |
| Open the pay or book link | POST /posts/:postId/link-click → 204, then open externalUrl | Counts one click per person for the host |
| Who is going | GET /posts/:postId/attendees?state=going | Also requested and waitlisted. Answer carries counts for all three, and position in the queue for waitlisted people |
| Host: accept a request | POST /posts/:postId/attendees/:userId/accept | 409 POST_FULL when no spot is left and no waitlist |
| Host: decline a request | POST /posts/:postId/attendees/:userId/decline | Final; the person cannot ask again |
| Host: remove someone | POST /posts/:postId/attendees/:userId/remove | They get a push |
| Host: edit | PATCH /posts/:postId, PUT /posts/:postId/images | A live post is re-checked against the publish rules on every edit. Price cannot change on a live post (409) |
| Host: cancel | POST /posts/:postId/cancel | For a live post someone joined. Everyone going or waitlisted gets a push |
| Host: delete | DELETE /posts/:postId → 204 | Drafts and posts nobody joined. 409 POST_HAS_ATTENDEES otherwise: offer Cancel instead |
| Plan checklist: edit lines | PUT /posts/:postId/checklist { items: [{ id?, text }] } | Host only, up to 30 lines. Keep id on existing lines so ticks survive |
| Plan checklist: tick a line | PATCH /posts/:postId/checklist/:itemId { checked } | The host and anyone going |
| Report this post | POST /posts/:postId/report { reason, details? } → 202 | details is required when reason is other. 409 if a report is already open |
| Share | build the link from the post id | The deep-link files in section 11 make `https://<links host>/posts/<id>` open the app |

## 7. Explore

The map shows the pins of the same city the feed picked. Pan and zoom change the box you ask for, not the city.

| Figma element | API call | Notes |
| :---- | :---- | :---- |
| Map pins | GET /map/pins?bbox=west,south,east,north&type=meetup with X-Client-Location | Up to 500 pins: { id, type, lat, lng, title, startAt }. The box must be under 5 degrees on each side (400 otherwise). Debounce on camera idle. type optional |
| Type chips (Meetup, Event, Plan, Group) | the type query | One type at a time, or none for all |
| Tap a pin → mini card | GET /posts/:postId | The card needs the image, going count and rsvpState; the pin alone does not carry them |
| RSVP · Free on the mini card | POST /posts/:postId/rsvp | Section 6 |
| Search city or country | GET /cities?q= to move the camera | Pins still come from the picked city only. Showing another city's pins needs the Teleport work in section 12 |
| Locate me | device GPS, then refresh the pins | Also update the X-Client-Location header |
| Meetup grid by interest (not drawn, part of the Explore tab in the requirements) | GET /explore/meetups?interestId=&limit=20 | Same page shape as the feed, meetups only, interest match weighted higher. Chips come from GET /interests |

## 8. Trips tab

Only two of the three tabs have an API today. "Upcoming" can list what the user hosts and "Past" what they attended; a list of posts the user joined or requested does not exist yet.

| Figma screen | API call | Notes |
| :---- | :---- | :---- |
| Trips / Upcoming: cards marked Hosting | GET /me/posts?status=published&limit=20 | Newest first, includes cancelled and taken-down posts since publishing. Each item is a card plus status, publishedAt, updatedAt. Filter to startAt in the future on the client, or show past hosted posts under Past |
| Trips / Upcoming: cards the user joined (Going, Waitlisted) | no endpoint | Section 12. Until it exists, the only way to know is rsvpState on each post you already hold |
| Trips / Requests (Request sent) | no endpoint | Section 12 |
| Trips / Past | GET /me/attended?limit=20 | Posts the user was marked as attended at, latest first. Same card shape as the hosted grid |
| Trips / Empty: Explore activities | go to the Explore tab |  |
| View trip | GET /posts/:postId | Section 6 |

Not the same thing: GET /me/trips lists the user's dated city visits ("in Accra 18 to 20 Oct") that show as "visiting" on their profile. It is a profile feature, not this tab.

## 9. Profile

The own profile reads from GET /me; another person's profile reads from GET /users/:userId. The badges, stamps, streaks and the three counters at the top have no API yet.

| Figma screen | Element | API call | Notes |
| :---- | :---- | :---- | :---- |
| Profile / Own Profile | name, handle, city, bio, chips, photo | GET /me | handle, displayName, avatarUrl, homeCity, bio, interests, extras (languages, lookingTo, social links, pronouns, tagline), photos, visiting, verified |
| Profile / Own Profile | Events, Countries, Streak counters | no endpoint | Section 12 |
| Profile / Own Profile | Edit Profile | Settings / Edit Profile, section 10 |  |
| Profile / Own Profile | Share | deep link `https://<links host>/users/<handle>` |  |
| Profile / Own Profile | Going / Requested tabs | no endpoint | Same gap as the Trips tab. Hosted posts: GET /me/posts?status=published. Attended: GET /me/attended |
| Profile / Own Profile | Achievements, See all, badge detail | no endpoint | Section 12 |
| AJALA Stamps screen | stamps, Lagos journey, events attended | no endpoint | GET /me/attended gives the attended list, but nothing groups it by city or counts experiences. Section 12 |
| Profile / Other User | header and bio | GET /users/:userId or GET /users/handle/:handle | ageBand instead of a date of birth, memberSince, blockedByMe. 404 when the person is suspended, deleted, or has blocked the viewer |
| Profile / Other User | their posts grid | GET /users/:userId/posts?limit=20 | Live posts only, latest date first |
| Profile / Other User | posts they attended | GET /users/:userId/attended?limit=20 |  |
| Profile / Other User | Follow | no endpoint | Section 12 |
| Bottom Sheet Panel (the ⋯ menu) | Block | POST /users/:userId/block → 204; DELETE /users/:userId/block to unblock | Blocked people disappear from the feed and attendee lists both ways |
| Bottom Sheet Panel | Report | POST /users/:userId/report { reason, details? } → 202 | details required when reason is other |
| Photo gallery (not drawn, exists in the API) | up to 6 photos | POST /me/photos (multipart file), DELETE /me/photos/:photoId, PUT /me/photos/order { ids } | Worth adding to the profile designs |
| Verified badge (not drawn, exists in the API) | selfie verification | POST /me/verification (multipart), GET /me/verification | Shows verified on cards and profiles once an admin approves |

## 10. Settings

Most of Settings is GET /me, PATCH /me and PATCH /me/settings. Sensitive changes (email, delete account, data export) need a recent re-auth first: call POST /me/reauth with the password, or POST /me/reauth/code then POST /me/reauth { code } for Google and Apple accounts, and the stamp lasts 5 minutes. A 403 REAUTH_REQUIRED means do that first.

| Figma screen | Element | API call | Notes |
| :---- | :---- | :---- | :---- |
| Settings / Overview | name, handle, photo | GET /me |  |
| Settings / Overview | Drafts count | GET /me/posts?status=draft | Count the page, or show the list |
| Settings / Overview | Help, About | GET /app/config | faqUrl, supportEmail, termsUrl, privacyUrl |
| Settings / Overview | Log out | POST /me/devices/unregister { token } then POST /auth/logout | Section 2 |
| Settings / Edit Profile | Profile photo | POST /me/avatar, DELETE /me/avatar |  |
| Settings / Edit Profile | Display name, username, current city, bio | PATCH /me { firstName, lastName, handle, homeCityId, bio } | Handle changes once every 30 days (409 HANDLE_COOLDOWN with availableAt). Check GET /handles/availability?handle= first |
| Settings / Edit Profile | Languages spoken: Manage | PATCH /me { extras: { languages: [...] } } | Send the whole list each time |
| Settings / Edit Profile | Travel style: Manage | no field | Section 12 |
| Settings / Edit Profile | Interests (not drawn here) | PATCH /me { interestIds } | 3 to 8 ids |
| Account & security | Email | re-auth, then POST /me/email/change { newEmail } → 202, then POST /me/email/change/confirm { code } → 204 | The code goes to the new address; the old one gets a notice. Other devices are signed out on confirm |
| Account & security | Change password | POST /me/password { currentPassword, newPassword } → 204 | Other devices are signed out. Google or Apple accounts with no password use POST /me/password/set { newPassword } after re-auth |
| Account & security | Connected accounts (Apple, Google) | read identities on GET /me | Each has provider and verifiedAt. Linking happens by signing in with that provider (section 1, the 409 flow). There is no unlink call: section 12 |
| Account & security | Sign-in activity | GET /me/sessions; DELETE /me/sessions/:sessionId | Device name, IP country, started, last used, current. Deleting one signs that device out |
| Account & security | Delete account | re-auth, then DELETE /me { reason? } → 202 { purgeAt } | 14-day grace, every device signed out. Signing in again before purgeAt cancels it |
| Settings / Drafts | list, filter chips | GET /me/posts?status=draft | Filter by type on the client |
| Settings / Drafts | Continue editing | PATCH /posts/:postId, PUT /posts/:postId/images, POST /posts/:postId/publish | Section 5 |
| Settings / Drafts | Delete | DELETE /posts/:postId → 204 |  |
| Settings / Notifications | Join Request | PATCH /me/settings { notifyJoinRequest } | Read current values from GET /me/settings |
| Settings / Notifications | Plan Updates | PATCH /me/settings { notifyRequestAccepted, notifyPostReminder } | Two toggles in the API behind one switch in Figma: set both |
| Settings / Notifications | New Messages | PATCH /me/settings { notifyNewMessage } | Chat is not built yet; the toggle is stored |
| Settings / Notifications | Nearby Activity, Recommendations | no field | Section 12. Other stored toggles with no screen: notifyNewComment, notifySubscription, marketingEmails |
| Settings / Appearance | System, Light, Dark | none | Client-only |
| Privacy & Safety | Profile visibility | PATCH /me/settings { hiddenFromSearch, showAge } | The nearest fields: hide from search, and whether the age band shows on the profile |
| Privacy & Safety | Show current city, Open to meet today | no field | Section 12 |
| Privacy & Safety | Share my plan | no endpoint | Section 12 |
| Privacy & Safety | Blocked accounts | GET /me/blocks?limit=20; DELETE /users/:userId/block |  |
| Privacy & Safety | Reports | no endpoint to list them | Section 12 |
| Privacy (not drawn) | Usage analytics on or off | PATCH /me/analytics { enabled } | Required for the privacy policy |
| Privacy (not drawn) | Download my data | re-auth, then POST /me/export → 202; GET /me/export for downloadUrl when ready | One export per 24 hours (409). Worth a row under Account & security |

## 11. App-level calls

Four things sit outside any screen: app config at launch, terms acceptance, push registration and deep links.

| When | API call | Notes |
| :---- | :---- | :---- |
| App launch, before any screen | GET /app/config (public, cacheable 5 minutes) | { termsVersion, termsUrl, privacyUrl, faqUrl, supportEmail, minAppVersion: { ios, android } }. Compare the build number to minAppVersion and block with a force-update screen when older |
| After sign-in, when GET /me says termsUpToDate: false | show the terms, then POST /me/terms/accept { version } → 204 | version is the termsVersion from app config. Sign-up already records acceptance through termsVersion in its body |
| After sign-in and whenever the push token changes | POST /me/devices { token, platform, appInstanceId?, timezone, deviceId } → 204 | platform is ios or android. The call also stores the timezone, which push reminders use |
| On sign-out | POST /me/devices/unregister { token } → 204 | Before POST /auth/logout |
| Push arrives | read the payload | Pushes carry a post id for RSVP events (request accepted, you were removed, post cancelled, reminder). Route to the post detail |
| Deep links | `https://<links host>/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` are served by the API | You supply the Apple team id and bundle id, the Android package name and the SHA-256 signing fingerprint; they are set in the API's config. Paths to handle: password reset (?token=), post links, profile links |
| Password reset link | the email opens the app with a token query parameter | Section 2 |

## 12. Designed but not in the backend yet

These elements appear in Figma and have no API today. Build the screens with the data hard-coded or hidden behind a flag, and treat the last column as the open question for the product owner.

| Element | Where in Figma | What exists today | Open question |
| :---- | :---- | :---- | :---- |
| Posts I joined or requested (Upcoming, Requests) | Trips tab; Profile Going / Requested | rsvpState on each post; attended list | Needs a GET /me/rsvps?state= endpoint. Highest priority gap: the Trips tab cannot work without it |
| Password reset by 6-digit code | Forgot Password flow | reset by emailed link with a 15-minute token | Keep the link (backend as built) or change the backend to a code? The screen changes either way |
| Full Name as one field | Create Account | firstName and lastName | Two fields in the design, or split on the client |
| Gender | not drawn | required for profile completion | Add a field to Profile Setup or Edit Profile |
| Travel style chips (40 options) | Profile Setup, Edit Profile | extras.lookingTo (6 fixed reasons) and interests | Are styles a second interest list, a new field, or dropped? |
| Favourite locations | Profile Setup | nothing | Store them, or drop the step. Dated trips (/me/trips) are a different feature |
| Interests on a post | missing from every create wizard | 1 to 3 interests are required to publish | Add an interests step to the wizard |
| Feed filter chips (Activities, Trips, Events, Food) | Home Feed | filter by post type only | Map chips to the four types, or define what Activities and Food mean |
| Teleport, Choose City, subscription, PRO badge | Home Feed sheets | feed city is automatic | Subscriptions (Apple and Google in-app purchase) are a later feature. Hide the sheet or show the current city only |
| Heart / save a post | Home Feed cards | nothing | Build saves, or drop the icon |
| Level, passport, stamps, badges, achievements, streaks | Home Feed card, Profile, Stamps screen | attended list only | A gamification feature of its own. Hide for launch or show static placeholders |
| Events / Countries / Streak counters | Profile header | nothing | Could be derived later from attended posts; not available now |
| Follow | Other User profile | nothing | Follows are not in the requirements; block and report are |
| Invite friends, Invite offline friends | Create wizard, Participants step | nothing | Share the post link instead |
| Shared cost "estimated split" and expected travellers | Cost Sharing step | priceCents and currency | The split is client maths. Confirm the amount sent is the per-person share |
| Waiting list toggle, pay or book link | not drawn | waitlistEnabled, externalUrl | Add both to the Participants and Cost Sharing steps |
| Post detail screen | not drawn | GET /posts/:postId and every join action | Needed before the feed cards can open anything |
| Nearby Activity, Recommendations toggles | Notifications | six other push toggles | Map to existing toggles or add two |
| Show current city, Open to meet today | Privacy & Safety | hiddenFromSearch, showAge | New settings fields if kept |
| Share my plan with a trusted contact | Privacy & Safety | nothing | A feature of its own |
| My reports list | Privacy & Safety | reports can be filed, not listed | Add GET /me/reports or drop the row |
| Unlink a connected account | Account & security | identities are listed, link by sign-in | Add an unlink endpoint if needed |
| Step-up code screen on sign-in | not drawn | 403 STEP_UP_REQUIRED | Reuse the Verification screen |
| Account-link code screen for Google and Apple | not drawn | 409 ACCOUNT_LINK_REQUIRED | Reuse the Verification screen |
| Photo gallery, selfie verification, data export, analytics toggle | not drawn | all built | Add to Edit Profile and Account & security |
