# AJALA Mobile: Screen to API Map

Oct 10, 2026 · @Adeboye oyelola · **Updated Nov 3, 2026 against the live Swagger** (`https://dev-api.ajalatrvl.com/api/v1/docs`) · **Re-synced Nov 9, 2026**

## How to use this document

Every screen in the AJALA Figma file is listed below with the API calls it needs. Where a screen has no API yet, it is listed in the last section so you can build it behind a flag or leave it for later. Rows marked **(updated)** or **(new)** changed in the Nov 3 sync. Rows marked **(Nov 9)** changed when this map was re-synced from Swagger on Nov 9 (the backend's answers are in [backend-answers-2026-11-09.md](backend-answers-2026-11-09.md); where they and Swagger differ, Swagger wins). The biggest change: **cities are gone**. Every place (home, favourite destinations, a post's place, teleport) is a Google place id picked with the Places SDK on the phone, and the feed is centred on the phone's location or a teleport, never a home city.

| Thing | Value |
| :---- | :---- |
| Base URL | `https://<api host>/api/v1` (the host is shared separately per environment) |
| Auth header | `Authorization: Bearer <accessToken>` on every call except sign-up, sign-in, forgot password, app config and the deep-link files |
| Access token | Lives 15 minutes. On a 401, call POST /auth/refresh with the refresh token and retry once |
| Refresh token | Lives 7 days idle, 30 days absolute. It rotates on every refresh: always store the new pair. Reusing an old one signs the session out |
| Location header | `X-Client-Location: <lat>,<lng>` when the app has location permission. Send it on feed, map, search, post detail, the Trips and Saved lists, and profile grids. **(Nov 9)** It is the feed's centre (30 km around it) and fills distanceKm on cards. Without it, and without a teleport, the feed, map and search answer 404 NO_LOCATION |
| Error body | `{ code, message, errors?, details?, requestId }`. code is a stable string such as POST_FULL; errors carries per-field messages on a 400 |
| Lists | Cursor based: send cursor and limit, read nextCursor from the answer; null means the end. Chat messages page with `before` instead |
| Post types | meetup, event, plan, group. The feed, map, search, saved list and create wizard all use these four strings |
| Realtime | **(Nov 9)** One socket.io socket on its own host: `https://dev-ws.ajalatrvl.com/chat` on dev (not the API host), WebSocket transport only, token in `auth.token`. Events: message.new, read.update, typing, session.expiring, server.restart (and rsvp.update per the RSVP docs). Refused connections arrive as connect_error with `error.data.code` |
| Full reference | The Postman collection is generated from the API's Swagger document and has every request body, response example and error code. Multi-step flows are explained in the request descriptions there |

The backend decides state. The app never computes whether a post is full, whether a user is verified or whether a draft can publish: it sends the call and shows the answer or the error.

## 1. Onboarding and sign up

Sign-up is three calls: create the account, verify the emailed code, then set up the profile with PATCH /me. Google and Apple skip the code step.

| Figma screen | What happens | API call | Notes |
| :---- | :---- | :---- | :---- |
| Splash, Onboarding slides (Passport, Build Your Journey, Badges) | App launch | GET /app/config (public) | Gives termsVersion, minAppVersion.ios / .android, terms and privacy URLs, support email. Show a force-update screen when the build is older than minAppVersion |
| Sign Up Option: Apple | Native Sign in with Apple | POST /auth/oauth/apple { identityToken, authorizationCode, nonce, firstName?, lastName?, termsVersion, deviceId, deviceName, deviceCheck?, timezone } | Returns the token pair, user and isNew. Apple gives the name only on the first authorisation, so always pass it when you have it |
| Sign Up Option: Google | Native Google sign-in | POST /auth/oauth/google { idToken, nonce, termsVersion, deviceId, deviceName, deviceCheck?, timezone } | Same answer shape as Apple |
| Both OAuth buttons: email already has an account | **(Nov 9)** 409 EMAIL_ALREADY_REGISTERED with details.signInMethods (password, google, apple) | none | The accounts are never joined and no email is sent. Tell the person how to get in, e.g. "Sign in with Google instead"; an empty list means show the message as it is. POST /auth/oauth/link and ACCOUNT_LINK_REQUIRED are gone. 403 SIGNUP_REFUSED: a new account with a banned email |
| Create Account (email, full name, date of birth, password) | Proceed | POST /auth/signup/email { email, password, firstName, lastName, dob, termsVersion, timezone? } → 202 | The API needs firstName and lastName; the design has one Full Name field, so split on the first space or ask the designer for two fields. dob is YYYY-MM-DD. Password rule: 8 to 128 characters, one uppercase, one digit, and not a known breached password (400 PASSWORD_BREACHED) |
| Email Verification (6-digit code) | Verify Code | POST /auth/otp/verify { target: <email>, code, password, deviceId, deviceName, deviceCheck?, timezone } | **(updated)** `password` is required when the code completes a sign-up; without it, or with the wrong one, the answer is the same 401 as a wrong code. Returns { accessToken, refreshToken, accessExpiresAt, sessionId, user, isNew }. Store both tokens in secure storage |
| Email Verification: resend | Resend code | POST /auth/otp/resend { target: <email> } → 202 | Always 202. Show a cooldown timer; a 429 means wait |
| Email verification failure sheet | Retry verification | same as resend | **(updated)** A wrong, expired or used code is a **401** (not 400), so offer resend |
| Email verified modal | Continue | GET /me | Route on the answer: profileCompletedAt null → Profile Setup; termsUpToDate false → show terms; otherwise Home |
| Any sign-up or sign-in success | After tokens are stored | POST /me/devices { token, platform, appInstanceId?, timezone, deviceId } | Registers the push token. **(Nov 9)** token is the Firebase push token on both platforms (not a raw APNs token). Do this once per sign-in and again whenever the push token changes |

deviceId is a stable id you generate once per install and keep. Send the same value on sign-in, on the device registration and on sign-out, so a password change elsewhere can keep this phone's push token.

**(new)** deviceCheck `{ platform, token }` is optional on every auth call: an iOS DeviceCheck token or an Android Play Integrity token. It is used only against ban evasion; leave it out on emulators or when generating it fails. **(Nov 9)** An email sign-up sends it on POST /auth/otp/verify, never on POST /auth/signup/email, and a malformed token is a 400.

## 2. Sign in and forgot password

Sign-in is one call. **(updated)** Forgot password is now three calls with a 6-digit code, which matches the Figma Verification screen.

| Figma screen | What happens | API call | Notes |
| :---- | :---- | :---- | :---- |
| Sign In Option | Apple / Google / Email | the same two OAuth calls as sign-up | One endpoint serves sign-up and sign-in; isNew tells you which happened |
| Sign In (email, password) | Sign In | POST /auth/login { email, password, deviceId, deviceName, deviceCheck? } | **(updated)** Returns the token pair only, no user: call GET /me next. LoginDto has no timezone field (send it with POST /me/devices). 401 wrong email or password; a locked account also answers 401, so the message stays "wrong email or password". 403 EMAIL_NOT_VERIFIED: a code was re-sent, go to Email Verification |
| Sign In: step-up | 403 STEP_UP_REQUIRED | POST /auth/login { email, password, otpCode, deviceId, deviceName } | The API emailed a 6-digit code because the sign-in looked unusual. Show the Verification screen and resend the same login with otpCode. Not in Figma yet |
| Sign In: account pending deletion | Sign-in succeeds | none extra | Signing in within 14 days of a delete request cancels the deletion. Show a short notice |
| Forgot Password (email) | Send Verification Code | POST /auth/password/forgot { email } → 202 | Always 202, even for an unknown email. A 6-digit code is emailed, valid 10 minutes, at most 3 emails an hour. A Google/Apple-only account gets an email saying so instead |
| Password Reset: Verification (6-digit code) | Verify Code | **(updated)** POST /auth/password/verify { email, code } → 200 { token } | The token works once, for 15 minutes. A wrong, expired or used code is 401; the fifth wrong code burns it, so offer "send a new code" |
| Create New Password | Reset Password | POST /auth/password/reset { token, newPassword } → 204 | Signs out every device. Same password rule as sign-up. 401 when the token expired: restart from Forgot Password |
| Password Reset Successful modal | Sign In | back to Sign In |  |
| Any screen, token expired | 401 on a call | POST /auth/refresh { refreshToken, deviceId } | Returns a new pair. If refresh itself fails, go to Sign In Option |
| Settings: Log out | Log out | POST /me/devices/unregister { token } then POST /auth/logout → 204 | Unregister the push token first so the phone stops receiving pushes for that account |
| Account & security: sign out everywhere | not in Figma | POST /auth/logout/all → 204 | Ends every session including this one |

## 3. Profile setup after sign up

All four setup screens write to the same PATCH /me. Send one PATCH per step, or collect everything and send one at the end; the API accepts any subset of fields. **(Nov 9)** Read profileCompletedAt from GET /me rather than computing it: first name, last name and date of birth are enough; gender is never needed. An email sign-up stays incomplete until its first PATCH /me, so always send one.

| Figma screen | Element | API call | Notes |
| :---- | :---- | :---- | :---- |
| Display Name | the @username | GET /handles/availability?handle= while typing, then PATCH /me { handle } | Availability answers { available, reason: taken, reserved, format, null }. It is throttled to 10 per minute, so debounce by about 600 ms. The PATCH answers 409 CONFLICT if taken and 409 HANDLE_COOLDOWN if the user changed it in the last 30 days |
| Profile Setup: Basic Details | Add profile photo | POST /me/avatar (multipart, field file) → { avatarUrl } | JPEG, PNG or WebP, up to 5 MB. 413 too large, 415 not an image. DELETE /me/avatar removes it |
| Profile Setup: Basic Details | Current city (auto-detected) | **(Nov 9)** Google Places SDK on the phone, then PATCH /me { homePlaceId } | GET /cities, /cities/resolve and homeCityId are gone. homePlaceId is a Google place id for a city; a venue or street address is a 400; null clears it. Read back as homePlace { placeId, label, countryCode } |
| Profile Setup: Basic Details | Languages spoken | PATCH /me { extras: { languages: ['en', 'es'] } } | ISO 639-1 two-letter codes. The chips in Figma map to codes on the client |
| Profile Setup: Basic Details | Gender (not drawn) | PATCH /me { gender } | **(Nov 9)** Optional and never needed for profileCompletedAt; woman, man, non_binary or prefer_not_to_say |
| Profile Setup: Travel Style | the style chips | **(new)** PATCH /me { extras: { travelStyles: [...] } } | A fixed list of 36 values (family, solo, foodie, backpacker, beach, hiking, nightlife, culture, digital_nomad and so on: see the TravelStyle type in the integration spec), up to 10. An empty list or null clears it. The old extras.lookingTo field is gone. Check the 40 Figma chips against the 36 values |
| Travel Interests ("What are you into?") | the interest chips | GET /interests for the list, then PATCH /me { interestIds: [...] } | The list comes from the server with id, slug, name and emoji. The API accepts 3 to 8; the screen says 5 to 8, so enforce 5 on the client if that is the product rule. Skip is allowed |
| Profile Setup: Favourite Locations | the city chips and search | **(Nov 9)** Google Places SDK for search, then PATCH /me { extras: { favouriteDestinationIds: [...] } } | Up to 10 Google place ids of cities (an 11th is a 400). Read back as favouriteDestinations on GET /me and on other people's profiles. GET /cities/popular is gone, so the Popular chips have no source |
| Loading screen after setup | Loading | GET /me | Confirms profileCompletedAt. **(Nov 9)** The home place no longer centres the feed |

## 4. Home feed

The feed is one call. **(Nov 9)** It shows every live, upcoming post within 30 km of a point: the teleport place (subscribers only), otherwise the location header. Nothing else is guessed: no network location, no home city.

| Figma screen | Element | API call | Notes |
| :---- | :---- | :---- | :---- |
| Home Feed | the card list | GET /feed?type=all&limit=20 with X-Client-Location: lat,lng | **(Nov 9)** Answer: { origin, originSource, items, nextCursor }. items are post cards: id, type, title, images (thumb, card, full URLs), startAt, endAt, recurrence, placeName, placeId, formattedAddress, localityLabel, countryCode, lat, lng, capacity, goingCount, rsvpState, saved, price (or nothing), externalUrl, host (name, avatar, verified), interests, distanceKm. There is no city on a card any more. Page with cursor=nextCursor |
| Home Feed | city name in the header ("Lagos") | from the feed answer | **(Nov 9)** origin { lat, lng, label, region } and originSource (device or teleport). For teleport show "Teleported to {origin.label}". For the device, label is null; origin.region (e.g. "Lagos") is the nearest thing to a city name |
| Home Feed | filter chips | GET /feed?type=meetup / event / plan / group | The backend filters by post type only. The chips in Figma (Activities, Trips, Events, Food) do not match: see section 12 |
| Home Feed / Skeleton | loading | same call | Show the skeleton until the first page lands |
| Home Feed | 404 NO_LOCATION | none | **(Nov 9)** No location header and no teleport. Ask for location permission (a home city no longer helps). Replaces NO_CITY |
| Home Feed | pull to refresh | same call without cursor | Cards are cached server-side for 10 minutes, so a brand-new post may take a moment to appear |
| Home Feed | tap a card | GET /posts/:postId | See section 6 |
| Home Feed | heart / save icon | **(new)** POST /posts/:postId/save → 204; DELETE /posts/:postId/save → 204 | saved on the card says the current state. 409 on a draft or cancelled post. The list is GET /me/saved (section 9) |
| Home Feed | search | **(new)** GET /search/posts?q=&interestIds=&type= and GET /search/people?q= | Runs on submit, no typeahead. Posts: q 2 to 100 characters and/or up to 10 interest chips, within 30 km of the feed's origin (404 NO_LOCATION without one). People: first name or handle. At most 100 results per search |
| Home Feed | bell / notifications | **(new)** GET /me/notifications, POST /me/notifications/read | Section 11 |
| Home Feed | Level, passport progress card | no endpoint | See section 12 |
| Choose City / Teleport sheet | city search, Popular row | **(Nov 9)** Google Places SDK, then POST /me/teleport { placeId } → 204 | placeId is a Google place id for a city; a venue or address is a 400 (not 404). Needs a subscription: 402 PAYMENT_REQUIRED means show the paywall. 503 when the map vendor is down. DELETE /me/teleport returns home. Refetch feed and map after either. GET /cities and /cities/popular are gone, so the Popular row has no source |
| Subscription / PRO paywall | Subscribe, Restore, Manage | **(new)** GET /me/subscription, GET /me/subscription/challenge, POST /me/subscription/apple or /google | iOS: App Attest + StoreKit 2. Android: Play Integrity + Play Billing. Web: /me/subscription/checkout, /checkout/confirm, /portal. 503 means subscriptions are off in this environment. GET /me also carries subscribed and subscribedUntil |
| Create Something modal | pick Meetup, Event, Plan or Group | none | Client-only. The choice becomes type in section 5 |

## 5. Create a Meetup, Event, Plan or Group

The whole wizard is one request. Collect every step locally and send a single POST /posts as multipart/form-data when the user taps Publish (with status=published) or Save draft (with status=draft). The four wizards in Figma differ only in type and in a few rules listed under the table.

| Wizard step | Figma element | Form field | Rules |
| :---- | :---- | :---- | :---- |
| Basic Details | Photos (2 to 4 required) | images (repeat the field, 0 to 4 files) | JPEG, PNG or WebP, 5 MB each. First file is the cover. A draft may have none; publishing needs 2 to 4 |
| Basic Details | Title | title | Up to 80 characters (the design says 100: use 80) |
| Basic Details | Description | description | Up to 1,000 characters; needed to publish |
| Schedule | Date and Time | startAt, **(new)** endAt | ISO 8601 with offset, for example 2026-10-22T18:00:00+01:00. startAt must be in the future to publish. endAt is optional and must be after startAt |
| Schedule | Meeting point | **(Nov 9)** placeId, or lat and lng; placeName | Every type needs a place to publish. Send placeId (a Google place id from the Places SDK: the venue, or a Plan or Group's destination) and the server fetches the coordinates and address; or send lat and lng for a pin dropped on the map. Never both. placeName is the label under the card; the place's city name when left out. cityId is gone. 503 when the map vendor is down |
| Schedule (Event only) | running order (not drawn) | **(new)** schedule (repeat the field, one line each) | Events only; a 400 on any other type. **(Nov 9)** Up to 30 lines of 120 characters |
| Schedule (Plan only) | itinerary / stops (not drawn) | **(new)** itinerary (repeat the field, one line each) | Plans only; a 400 on any other type. Replaces the old Plan checklist. **(Nov 9)** Up to 30 lines of 120 characters |
| Schedule (Group only) | repeats (not drawn) | **(new)** recurrence (weekly, biweekly, monthly), recurrenceEndsOn (date) | Groups only. A monthly Group must start on the 1st to the 28th. The server moves the date on after each meeting and keeps the people going |
| Participants | Capacity ("10 people") | capacity | Optional. Event: over 100 or none. Group: 1 to 100. Meetup and Plan: any |
| Participants | Open to everyone / Request to join | visibility | open or private. Private means people request and the host accepts |
| Participants | Show on map | showOnMap | true or false as text |
| Participants | waiting list (not drawn) | waitlistEnabled | true lets people queue when full. Worth a toggle |
| Participants | Invite friends | no endpoint | Share the post link. Everyone going is in the post's group chat automatically (section 6) |
| Cost Sharing | Shared cost toggle, currency, amount, expected travellers | **(Nov 9)** removed | No shared cost anywhere: costTotalCents, costCurrency, expectedCount and the card's split are gone, and sending them is a 400. The design's cost screens are out of date |
| Price | ticket price (paid post) | priceCents, currency | **(Nov 9)** Optional on Meetups, Events and Groups (a Skip button), paid Events too. Plans carry no money: a price, currency or link on a Plan is a 400. Both or neither, the price per person in the smallest unit (USD 20 is 2000). currency is any upper-case ISO 4217 code. The price cannot change once the post is live |
| Price | link to pay or book (not drawn) | externalUrl | **(Nov 9)** https:// only, optional, not on a Plan. Every post joins by RSVP: joining opens the link, calls POST /posts/:postId/link-click, then RSVPs |
| Review | interests (not drawn) | interestIds (repeat the field, 1 to 3 ids) | Required to publish. Pick from GET /interests. Missing from every wizard in Figma: see section 12 |
| Review | Publish | status=published | 201 with the full post. Then show the Published / Success modal |
| Any step | Save draft | status=draft | 201. A draft needs only type and title. 20 drafts maximum (409 on the 21st) |

After a draft exists, edits go to PATCH /posts/:postId as JSON (any field but type and status; send null to clear where allowed), pictures to PUT /posts/:postId/images (multipart, the whole set in order), and publishing to POST /posts/:postId/publish. **(Nov 9)** Move the place with placeId, or with lat and lng together; lat and lng are not nullable (a live post always keeps a place).

Errors to handle on Publish:

* 400 VALIDATION_FAILED with an errors list naming every failed rule at once (date in the past, no place, fewer than 2 photos, no description, no interests, Event capacity too low, a price or link on a Plan, a type-only field on the wrong type). Show them all on the Review step. **(Nov 9)** A paid Event no longer needs a link.
* 409 EVENT_MONTHLY_CAP: three Events per calendar month; details.resetsAt says when the cap resets. Show it in the error modal.
* 409 CONFLICT on the 21st draft.
* 413 image over 5 MB, 415 not an image.
* 403: the host is suspended.

## 6. Post detail, joining and attendees

Figma has no post detail screen yet; the Explore mini-card ("RSVP · Free", "27 joined · 13 left") is the closest. Every button on that card and on a future detail screen maps to the calls below.

| Element | API call | Notes |
| :---- | :---- | :---- |
| Open a post | GET /posts/:postId with X-Client-Location | The card fields (**(Nov 9)** with placeId, formattedAddress, localityLabel and countryCode instead of city) plus description, showOnMap, waitlistEnabled, status, schedule (Events), itinerary (Plans), isHost, rsvpState, waitlistPosition, linkClickCount (host only). 404 when the post is a draft of someone else, taken down, or the host blocked the viewer |
| Join button label | rsvpState on the post | rsvpState is none, going, waitlisted, requested, declined or removed. **(Nov 9)** joinMode is gone: every post joins by RSVP |
| Join / Request to join | POST /posts/:postId/rsvp → { state, goingCount, capacity, waitlistPosition } | Open post: going, or waitlisted when full and the waitlist is on. Private post: requested. 409 POST_FULL, POST_STARTED, POST_CANCELLED, CONFLICT (own post, or the host declined you). **(Nov 9)** EXTERNAL_BOOKING is gone |
| Leave / cancel request | DELETE /posts/:postId/rsvp → 204 | Frees the spot and promotes the next waitlisted person, who gets a push |
| Open the post's link | POST /posts/:postId/link-click → 204, and open externalUrl | When joining a post that has one. Counts one click per person for the host |
| Save / unsave | **(new)** POST /posts/:postId/save, DELETE /posts/:postId/save | See section 4 |
| Who is going | GET /posts/:postId/attendees?state=going | Also requested and waitlisted (host only). Answer carries counts, and position in the queue for waitlisted people. On a private post only the host and people going can read the going list |
| Host: accept a request | POST /posts/:postId/attendees/:userId/accept | 409 POST_FULL when no spot is left and no waitlist; with a waitlist they join the line |
| Host: decline a request | POST /posts/:postId/attendees/:userId/decline | Final; the person cannot ask again and gets no push |
| Host: remove someone | POST /posts/:postId/attendees/:userId/remove | Final. They get a push |
| Host: edit | PATCH /posts/:postId, PUT /posts/:postId/images | A live post is re-checked against the publish rules on every edit. Price cannot change on a live post |
| Host: cancel | POST /posts/:postId/cancel | For a live post someone joined. Everyone going or waitlisted gets a push |
| Host: delete | DELETE /posts/:postId → 204 | Drafts and posts nobody joined. 409 POST_HAS_ATTENDEES otherwise: offer Cancel instead |
| Group chat | **(Nov 9)** POST /conversations { postId } | Made automatically when the post goes live; everyone going joins, up to 100. The call only finds it for someone in it: 409 GROUP_CHAT_FULL while waiting for a place, 404 otherwise. A cancelled or deleted post removes its chat. See section 10a |
| Plan checklist | **(removed)** | PUT/PATCH checklist endpoints are gone from Swagger. Show the Plan's itinerary lines instead |
| Comments | **(new)** GET /posts/:postId/comments, POST /posts/:postId/comments { body, parentId? }, GET .../comments/:commentId/replies, DELETE .../comments/:commentId, POST .../comments/:commentId/report | One level of replies, oldest first, 1,000 characters. canDelete shows the delete button (own comments, or any on a post you host). deleted: true means show "Comment deleted". 409 POST_CANCELLED when writing on a cancelled post |
| Report this post | POST /posts/:postId/report { reason, details? } → 202 | details is required when reason is other. 409 if a report is already open. 403 REPORTING_PAUSED if a moderator paused the user's reporting |
| Share | build the link from the post id | The deep-link files in section 11 make `https://<links host>/posts/<id>` open the app |

## 7. Explore

**(Nov 9)** The map uses the same origin as the feed (the location header, or a teleport). A free reader sees only pins within 30 km of the origin (`reach: radius`), so panning away shows an empty map: offer Teleport. A subscriber sees every pin in the box wherever they pan (`reach: box`).

| Figma element | API call | Notes |
| :---- | :---- | :---- |
| Map pins | GET /map/pins?bbox=west,south,east,north&type=meetup with X-Client-Location | **(Nov 9)** Answer { origin, originSource, reach, pins }; up to 500 pins: { id, type, lat, lng, title, startAt }, soonest first. The box must be at most 5 degrees wide, 20 for a subscriber (400 otherwise). 404 NO_LOCATION without a location or teleport. Debounce on camera idle. type optional |
| Type chips (Meetup, Event, Plan, Group) | the type query | One type at a time, or none for all |
| Search on the map | **(new)** the q query on GET /map/pins | Up to 80 characters; keeps the pins whose title contains it |
| Tap a pin → mini card | GET /posts/:postId | The card needs the image, going count and rsvpState; the pin alone does not carry them |
| RSVP · Free on the mini card | POST /posts/:postId/rsvp | Section 6 |
| Search city or country | **(Nov 9)** Google Places SDK to move the camera | GET /cities is gone. A free reader still sees only pins within 30 km of the origin; to see another city's pins, teleport (section 4) |
| Locate me | device GPS, then refresh the pins | Also update the X-Client-Location header |
| Meetup grid by interest | **(updated)** GET /explore/meetups is removed | Use GET /search/posts?interestIds=...&type=meetup, or GET /feed?type=meetup |

## 8. Trips tab

**(updated)** All three tabs now have an API.

| Figma screen | API call | Notes |
| :---- | :---- | :---- |
| Trips / Upcoming: cards the user joined (Going) | **(new)** GET /me/rsvps?state=going&limit=20 | Live posts the user is going to that have not ended, soonest first |
| Trips / Upcoming: cards marked Hosting | GET /me/posts?status=published&limit=20 | Newest first, includes cancelled and taken-down posts. Filter to startAt in the future on the client, and merge with the Going list if the design shows both together |
| Trips / Requests (Request sent) | **(new)** GET /me/rsvps?state=requested | Private posts the user asked to join that the host has not answered |
| Trips / Past | GET /me/attended?limit=20 | Posts the user was going to that have happened, latest first; cancelled ones left out |
| Trips / Empty: Explore activities | go to the Explore tab |  |
| View trip | GET /posts/:postId | Section 6 |

**(Nov 9)** Waitlisted posts: GET /me/rsvps?state=waitlisted; the place in line is on the post screen (waitlistPosition). Posts the user hosts are never in /me/rsvps, so merging with /me/posts can't duplicate. The old dated city visits (/me/trips) are no longer in Swagger.

## 9. Profile

The own profile reads from GET /me; another person's profile reads from GET /users/:userId. The badges, stamps, streaks and the three counters at the top have no API yet.

| Figma screen | Element | API call | Notes |
| :---- | :---- | :---- | :---- |
| Profile / Own Profile | name, handle, city, bio, chips, photo | GET /me | **(Nov 9)** handle, avatarUrl, homePlace, bio, interests, extras (languages, travelStyles, favouriteDestinationIds, social links, pronouns, tagline), favouriteDestinations, photos, visiting (always null for now), teleport, verified, subscribed |
| Profile / Own Profile | Events, Countries, Streak counters | no endpoint | Section 12 |
| Profile / Own Profile | Edit Profile | Settings / Edit Profile, section 10 |  |
| Profile / Own Profile | Share | deep link `https://<links host>/users/<handle>` |  |
| Profile / Own Profile | Going / Requested tabs | **(updated)** GET /me/rsvps?state=going / requested | Same as the Trips tab. Hosted posts: GET /me/posts?status=published. Attended: GET /me/attended |
| Profile / Own Profile | Saved (not drawn here) | **(new)** GET /me/saved?type=all|meetup|event|plan|group | Newest save first; cancelled posts stay listed |
| Profile / Own Profile | Achievements, See all, badge detail | no endpoint | Section 12 |
| AJALA Stamps screen | stamps, Lagos journey, events attended | no endpoint | GET /me/attended gives the attended list, but nothing groups it by city or counts experiences. Section 12 |
| Profile / Other User | header and bio | GET /users/:userId or GET /users/handle/:handle | **(Nov 9)** homePlace, favouriteDestinations, openToMeetToday, sharePlans, memberSince, blockedByMe. ageBand is gone. homePlace is null when unset or when they hide it. 404 when the person is suspended, deleted, or has blocked the viewer |
| Profile / Other User | their posts grid | GET /users/:userId/posts?limit=20 | Live posts only, latest date first |
| Profile / Other User | posts they attended | GET /users/:userId/attended?limit=20 |  |
| Profile / Other User | their upcoming plans | **(new)** GET /users/:userId/plans | Open posts they are going to, soonest first. Empty unless sharePlans is on |
| Profile / Other User | Message | **(new)** POST /conversations { userId } | Returns the existing direct chat or a new one. 403 when they only take messages from people they share a post with; 429 CHAT_START_LIMIT on too many new chats in a day |
| Profile / Other User | Follow | no endpoint | Section 12 |
| Bottom Sheet Panel (the ⋯ menu) | Block | POST /users/:userId/block → 204; DELETE /users/:userId/block to unblock | Blocked people disappear from the feed, attendee lists and search both ways, and a direct chat ends |
| Bottom Sheet Panel | Report | POST /users/:userId/report { reason, details? } → 202 | details required when reason is other. 403 REPORTING_PAUSED |
| Photo gallery (not drawn, exists in the API) | up to 6 photos | POST /me/photos (multipart file), DELETE /me/photos/:photoId, PUT /me/photos/order { ids } | Worth adding to the profile designs |
| Verified badge | verified on cards and profiles | none | **(Nov 9)** "Verified host: our team reviewed this profile. It is not a check of who the person is." Show the badge only; don't word it as an identity check |

## 10. Settings

Most of Settings is GET /me, PATCH /me and PATCH /me/settings. Sensitive changes (email, unlinking Google or Apple, delete account, data export, setting a first password) need a recent re-auth first: call POST /me/reauth with the password, or POST /me/reauth/code then POST /me/reauth { code } for Google and Apple accounts, and the stamp lasts 5 minutes. A 403 REAUTH_REQUIRED means do that first.

| Figma screen | Element | API call | Notes |
| :---- | :---- | :---- | :---- |
| Settings / Overview | name, handle, photo | GET /me |  |
| Settings / Overview | Drafts count | GET /me/posts?status=draft | Count the page, or show the list |
| Settings / Overview | Subscription (not drawn) | **(new)** GET /me/subscription | manage says where: the OS screen for apple and google, POST /me/subscription/portal for web |
| Settings / Overview | Help, About | GET /app/config | faqUrl, supportEmail, termsUrl, privacyUrl |
| Settings / Overview | Log out | POST /me/devices/unregister { token } then POST /auth/logout | Section 2 |
| Settings / Edit Profile | Profile photo | POST /me/avatar, DELETE /me/avatar |  |
| Settings / Edit Profile | Display name, username, current city, bio | PATCH /me { firstName, lastName, handle, homePlaceId, bio } | **(Nov 9)** homePlaceId is a Google place id for a city (Places SDK); homeCityId is gone. Handle changes once every 30 days (409 HANDLE_COOLDOWN with details.availableAt). Check GET /handles/availability?handle= first |
| Settings / Edit Profile | Languages spoken: Manage | PATCH /me { extras: { languages: [...] } } | Send the whole list each time |
| Settings / Edit Profile | Travel style: Manage | **(new)** PATCH /me { extras: { travelStyles: [...] } } | Up to 10 of the fixed list |
| Settings / Edit Profile | Favourite destinations (not drawn here) | **(Nov 9)** PATCH /me { extras: { favouriteDestinationIds: [...] } } | Up to 10 Google place ids of cities |
| Settings / Edit Profile | Interests (not drawn here) | PATCH /me { interestIds } | 3 to 8 ids |
| Account & security | Email | re-auth, then POST /me/email/change { newEmail } → 202, then POST /me/email/change/confirm { code } → 204 | The code goes to the new address; the old one gets a notice. Other devices are signed out on confirm |
| Account & security | Change password | POST /me/password { currentPassword, newPassword } → 204 | Other devices are signed out. Google or Apple accounts with no password use POST /me/password/set { newPassword } after re-auth |
| Account & security | Connected accounts (Apple, Google) | read identities on GET /me; **(new)** DELETE /me/identities/:provider to unlink | Each identity has provider only. **(Nov 9)** There is no way to link a provider to an existing account any more: signing in with Google or Apple on an email that has an account answers 409 EMAIL_ALREADY_REGISTERED. Unlink needs re-auth; 409 LAST_SIGN_IN_METHOD when it is the only way in, so offer "set a password" first |
| Account & security | Sign-in activity | GET /me/sessions; DELETE /me/sessions/:sessionId | Device name, IP country, started, last used, current. Deleting one signs that device out |
| Account & security | Delete account | re-auth, then DELETE /me { reason? } → 202 { purgeAt } | 14-day grace, every device signed out. Signing in again before purgeAt cancels it |
| Settings / Drafts | list, filter chips | GET /me/posts?status=draft | Filter by type on the client |
| Settings / Drafts | Continue editing | PATCH /posts/:postId, PUT /posts/:postId/images, POST /posts/:postId/publish | Section 5 |
| Settings / Drafts | Delete | DELETE /posts/:postId → 204 |  |
| Settings / Notifications | Join Request | PATCH /me/settings { notifyJoinRequest } | Read current values from GET /me/settings |
| Settings / Notifications | Plan Updates | PATCH /me/settings { notifyRequestAccepted, notifyPostReminder } | Two toggles in the API behind one switch in Figma: set both |
| Settings / Notifications | New Messages | PATCH /me/settings { notifyNewMessage } | **(updated)** Chat is now built (section 10a) |
| Settings / Notifications | Nearby Activity, Recommendations | **(Nov 9)** PATCH /me/settings { notifyNearbyActivity, notifyRecommendations } | Saved only: nothing is sent yet. Defaults on and off. Other stored toggles with no screen: notifyNewComment, notifySubscription. marketingEmails is gone |
| Settings / Appearance | System, Light, Dark | none | Client-only |
| Privacy & Safety | Profile visibility | PATCH /me/settings { hiddenFromSearch } | **(updated)** showAge is gone |
| Privacy & Safety | Show current city | **(new)** PATCH /me/settings { showCurrentCity } | Off makes homePlace null on the public profile |
| Privacy & Safety | Open to meet today | **(new)** PATCH /me/settings { openToMeetToday } | Switches itself off at the user's midnight. Shows on the public profile |
| Privacy & Safety | Share my plan | **(Nov 9)** PUT /me/trusted-person { userId } (re-auth first), GET and DELETE /me/trusted-person; GET /me/trusted-by, POST /me/trusted-by/:linkId/accept, DELETE /me/trusted-by/:linkId, GET /me/trusted-by/:linkId/plans | The design's "Share my plan" is the trusted person: one member, found with GET /search/people, who must accept and then hears when plans change (category trusted_person). 403 without a recent re-auth; 404 for every refusal; 429 TRUSTED_REQUEST_LIMIT. A plan with unavailable: true shows "A plan you can't see". The public sharePlans setting (GET /users/:userId/plans) stays and needs a clearly different name |
| Privacy & Safety | Messages: who can message me, read receipts (not drawn) | **(new)** PATCH /me/settings { dmPermission: anyone | shared_only, readReceipts } |  |
| Privacy & Safety | Blocked accounts | GET /me/blocks?limit=20; DELETE /users/:userId/block |  |
| Privacy & Safety | Reports | **(new)** GET /me/reports | Posts, people, comments and messages the user reported, newest first, with status open, resolved or dismissed. The text written is not returned |
| Privacy (not drawn) | Usage analytics on or off | PATCH /me/analytics { enabled } | Required for the privacy policy |
| Privacy (not drawn) | Download my data | re-auth, then POST /me/export → 202; GET /me/export for downloadUrl when ready | One export per 24 hours (409). 403 EMAIL_NOT_VERIFIED without a verified email. Worth a row under Account & security |

## 10a. Messages (new)

Chat is built. Figma screens for it were not part of the original map; these are the calls.

| Element | API call | Notes |
| :---- | :---- | :---- |
| Inbox list, tabs All / Unread / Groups, search | GET /conversations?tab=&search= | Latest activity first, with lastMessage (120-character preview, senderName), imageUrl (a group's post cover) and unreadCount (up to 99) |
| Messages badge | **(Nov 9)** GET /conversations/unread-count → { count } | Conversations with anything unread, not messages. Chat is never in GET /me/notifications |
| Open a chat | GET /conversations/:id, then GET /conversations/:id/messages?before=&limit=30 | Members with online and how far each has read. Messages newest first; send the oldest id you hold as before for more |
| Send | POST /conversations/:id/messages (multipart: clientMsgId, body, taggedPostId, images) | clientMsgId is a uuid the app makes; a retry with the same one returns the first message. Up to 2,000 characters and 4 pictures. Picture links last an hour |
| Read receipts, typing | POST /conversations/:id/read { messageId }; POST /conversations/:id/typing | Typing at most every 3 seconds, shown for 5 |
| Live updates | **(Nov 9)** socket `https://dev-ws.ajalatrvl.com/chat` (dev): message.new, read.update, typing, session.expiring, server.restart | message.new has no mine: compare sender.id with your own. On session.expiring refresh the token and reconnect before inMs; after a server cut (io server disconnect) the client does not reconnect by itself. Refetch the thread and list after any reconnect |
| Group members | POST /conversations/:id/members { userId }; DELETE /conversations/:id/members/:userId | Host adds people going to the post; anyone can remove themselves; the host cannot leave |
| Report a message | POST /conversations/:id/messages/:messageId/report | Same reasons as a post |
| Message states | removed: true, taggedPostUnavailable: true | Show "This message was removed" and "no longer available" |

## 11. App-level calls

Five things sit outside any screen: app config at launch, terms acceptance, push registration, the notification inbox and deep links.

| When | API call | Notes |
| :---- | :---- | :---- |
| App launch, before any screen | GET /app/config (public, cacheable 5 minutes) | { termsVersion, termsUrl, privacyUrl, faqUrl, supportEmail, minAppVersion: { ios, android } }. Compare the build number to minAppVersion and block with a force-update screen when older |
| After sign-in, when GET /me says termsUpToDate: false | show the terms, then POST /me/terms/accept { version } → 204 | version is the termsVersion from app config. Sign-up already records acceptance through termsVersion in its body |
| After sign-in and whenever the push token changes | POST /me/devices { token, platform, appInstanceId?, timezone, deviceId } → 204 | token is the Firebase push token on both platforms; platform is ios or android. The call also stores the timezone, which push reminders use |
| On sign-out | POST /me/devices/unregister { token } → 204 | Before POST /auth/logout |
| Push arrives | read the payload | **(updated)** The payload matches the inbox item's data: kind and usually postId. Route to the post detail or the chat |
| Notifications screen and badge | **(new)** GET /me/notifications?unread=false|true; POST /me/notifications/read { ids? } | Last 90 days, newest first, including pushes switched off in Settings. unreadCount is the badge. Leave ids out to mark everything read. category picks the icon: join_request, request_accepted, post_reminder, new_comment, subscription, post_update, **trusted_person**, moderation. **(Nov 9)** new_message is push only and never in the inbox. data.kind is always there: rsvp.requested, rsvp.accepted, rsvp.promoted, rsvp.removed, post.cancelled, post.taken_down, post.details_changed, post.reminder, comment.new (with commentId), subscription.ending, moderation.warning, trusted.request / plans / accepted / ended / reminder (with linkId except on ended) |
| Deep links | `https://<links host>/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` are served by the API | You supply the Apple team id and bundle id, the Android package name and the SHA-256 signing fingerprint; they are set in the API's config. Paths to handle: post links, profile links, the web checkout return |

## 12. Designed but not in the backend yet

These elements appear in Figma and have no API today. Build the screens with the data hard-coded or hidden behind a flag, and treat the last column as the open question for the product owner.

**Resolved in the Nov 3 sync and removed from this list:** posts I joined or requested (/me/rsvps), password reset by code, travel style chips (extras.travelStyles), favourite locations, Teleport and the subscription, heart / save, Show current city and Open to meet today, My reports list, unlinking a connected account. **(Nov 9)** The shared cost is gone altogether. Also resolved on Nov 9: waitlisted posts (/me/rsvps?state=waitlisted), gender (never needed), schedule and itinerary limits (30 lines of 120), Nearby Activity and Recommendations toggles, Share my plan (the trusted person), the account-link code screen (no longer exists).

| Element | Where in Figma | What exists today | Open question |
| :---- | :---- | :---- | :---- |
| Full Name as one field | Create Account | firstName and lastName | Two fields in the design, or split on the client |
| Travel style chips (40 in Figma) | Profile Setup, Edit Profile | 36 fixed travelStyles values | Map the Figma chips to the 36 values; drop or add the difference |
| Interests on a post | missing from every create wizard | 1 to 3 interests are required to publish | Add an interests step to the wizard |
| Event schedule, Plan itinerary, Group recurrence, end time | not drawn | schedule, itinerary (30 lines of 120 each), recurrence, endAt | Add to the wizards |
| Plan checklist with ticks | not drawn | removed from the API; itinerary is read-only lines | Is the tickable checklist dropped for good? |
| Feed filter chips (Activities, Trips, Events, Food) | Home Feed | filter by post type only; search by interest chips | Map chips to the four types, or to interest searches |
| Level, passport, stamps, badges, achievements, streaks | Home Feed card, Profile, Stamps screen | attended list only | A gamification feature of its own. Hide for launch or show static placeholders |
| Events / Countries / Streak counters | Profile header | nothing | Could be derived later from attended posts; not available now |
| Follow | Other User profile | nothing | Follows are not in the requirements; block, report and message are |
| Invite friends, Invite offline friends | Create wizard, Participants step | share link; host group chat | Share the post link instead |
| Waiting list toggle, pay or book link | not drawn | waitlistEnabled, externalUrl | Add both to the Participants and Price steps |
| Post detail screen | not drawn | GET /posts/:postId, every join action, comments, save | Needed before the feed cards can open anything |
| Messages screens | not in the original map | the whole chat API (section 10a) | Confirm the designs exist |
| Share my plan with a trusted contact | Privacy & Safety | **(Nov 9)** built: /me/trusted-person and /me/trusted-by (section 10) | Screens to design: choose a person, requests, their plans |
| Dated trips ("visiting") | Profile | parked: no endpoints; visiting ({ place }) is always null | Hide until trips come back |
| Selfie verification | not drawn | dropped; verified means our team reviewed the profile | None |
| Step-up code screen on sign-in | not drawn | 403 STEP_UP_REQUIRED | Reuse the Verification screen |
| "Sign in another way" message for Google and Apple | not drawn | **(Nov 9)** 409 EMAIL_ALREADY_REGISTERED with details.signInMethods | A sheet or inline message naming the way in (password, Google, Apple) |
| Popular cities row | Profile Setup, Teleport sheet | **(Nov 9)** nothing: GET /cities/popular is gone | Drop the row, or ask the backend for a popular-places list |
| Photo gallery, data export, analytics toggle, messaging privacy, subscription screen | not drawn | all built | Add to Edit Profile, Account & security and Privacy |
