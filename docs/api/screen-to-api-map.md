# AJALA Mobile: Screen to API Map

Oct 10, 2026 · @Adeboye oyelola · **Updated Nov 3, 2026 against the live Swagger** (`https://dev-api.ajalatrvl.com/api/v1/docs`)

## How to use this document

Every screen in the AJALA Figma file is listed below with the API calls it needs. Where a screen has no API yet, it is listed in the last section so you can build it behind a flag or leave it for later. Rows marked **(updated)** or **(new)** changed in the Nov 3 sync.

| Thing | Value |
| :---- | :---- |
| Base URL | `https://<api host>/api/v1` (the host is shared separately per environment) |
| Auth header | `Authorization: Bearer <accessToken>` on every call except sign-up, sign-in, forgot password, app config and the deep-link files |
| Access token | Lives 15 minutes. On a 401, call POST /auth/refresh with the refresh token and retry once |
| Refresh token | Lives 7 days idle, 30 days absolute. It rotates on every refresh: always store the new pair. Reusing an old one signs the session out |
| Location header | `X-Client-Location: <lat>,<lng>` when the app has location permission. Send it on feed, map, search, post detail, the Trips and Saved lists, and profile grids. It picks the feed city and fills distanceKm on cards |
| Error body | `{ code, message, errors?, details?, requestId }`. code is a stable string such as POST_FULL; errors carries per-field messages on a 400 |
| Lists | Cursor based: send cursor and limit, read nextCursor from the answer; null means the end. Chat messages page with `before` instead |
| Post types | meetup, event, plan, group. The feed, map, search, saved list and create wizard all use these four strings |
| Realtime | One socket on the `/chat` namespace: rsvp.update, message.new, read.update, typing |
| Full reference | The Postman collection is generated from the API's Swagger document and has every request body, response example and error code. Multi-step flows are explained in the request descriptions there |

The backend decides state. The app never computes whether a post is full, whether a user is verified or whether a draft can publish: it sends the call and shows the answer or the error.

## 1. Onboarding and sign up

Sign-up is three calls: create the account, verify the emailed code, then set up the profile with PATCH /me. Google and Apple skip the code step.

| Figma screen | What happens | API call | Notes |
| :---- | :---- | :---- | :---- |
| Splash, Onboarding slides (Passport, Build Your Journey, Badges) | App launch | GET /app/config (public) | Gives termsVersion, minAppVersion.ios / .android, terms and privacy URLs, support email. Show a force-update screen when the build is older than minAppVersion |
| Sign Up Option: Apple | Native Sign in with Apple | POST /auth/oauth/apple { identityToken, authorizationCode, nonce, firstName?, lastName?, termsVersion, deviceId, deviceName, deviceCheck?, timezone } | Returns the token pair, user and isNew. Apple gives the name only on the first authorisation, so always pass it when you have it |
| Sign Up Option: Google | Native Google sign-in | POST /auth/oauth/google { idToken, nonce, termsVersion, deviceId, deviceName, deviceCheck?, timezone } | Same answer shape as Apple |
| Both OAuth buttons: email already has an account | 409 ACCOUNT_LINK_REQUIRED with details.challengeId; a 6-digit code is emailed to that account | POST /auth/oauth/link { challengeId, code, deviceId } | Returns the token pair and user. No screen exists for this in Figma yet: reuse the Verification screen |
| Create Account (email, full name, date of birth, password) | Proceed | POST /auth/signup/email { email, password, firstName, lastName, dob, termsVersion, timezone? } → 202 | The API needs firstName and lastName; the design has one Full Name field, so split on the first space or ask the designer for two fields. dob is YYYY-MM-DD. Password rule: 8 to 128 characters, one uppercase, one digit, and not a known breached password (400 PASSWORD_BREACHED) |
| Email Verification (6-digit code) | Verify Code | POST /auth/otp/verify { target: <email>, code, password, deviceId, deviceName, deviceCheck?, timezone } | **(updated)** `password` is required when the code completes a sign-up; without it, or with the wrong one, the answer is the same 401 as a wrong code. Returns { accessToken, refreshToken, accessExpiresAt, sessionId, user, isNew }. Store both tokens in secure storage |
| Email Verification: resend | Resend code | POST /auth/otp/resend { target: <email> } → 202 | Always 202. Show a cooldown timer; a 429 means wait |
| Email verification failure sheet | Retry verification | same as resend | **(updated)** A wrong, expired or used code is a **401** (not 400), so offer resend |
| Email verified modal | Continue | GET /me | Route on the answer: profileCompletedAt null → Profile Setup; termsUpToDate false → show terms; otherwise Home |
| Any sign-up or sign-in success | After tokens are stored | POST /me/devices { token, platform, appInstanceId?, timezone, deviceId } | Registers the push token. Do this once per sign-in and again whenever the push token changes |

deviceId is a stable id you generate once per install and keep. Send the same value on sign-in, on the device registration and on sign-out, so a password change elsewhere can keep this phone's push token.

**(new)** deviceCheck `{ platform, token }` is optional on every auth call: an iOS DeviceCheck token or an Android Play Integrity token. It is used only against ban evasion; leave it out on emulators or when generating it fails.

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

All four setup screens write to the same PATCH /me. Send one PATCH per step, or collect everything and send one at the end; the API accepts any subset of fields. **(updated)** Read profileCompletedAt from GET /me rather than computing it: Swagger now says name and date of birth are enough and gender is optional, though one field description still lists gender (open question in section 12).

| Figma screen | Element | API call | Notes |
| :---- | :---- | :---- | :---- |
| Display Name | the @username | GET /handles/availability?handle= while typing, then PATCH /me { handle } | Availability answers { available, reason: taken, reserved, format, null }. It is throttled to 10 per minute, so debounce by about 600 ms. The PATCH answers 409 CONFLICT if taken and 409 HANDLE_COOLDOWN if the user changed it in the last 30 days |
| Profile Setup: Basic Details | Add profile photo | POST /me/avatar (multipart, field file) → { avatarUrl } | JPEG, PNG or WebP, up to 5 MB. 413 too large, 415 not an image. DELETE /me/avatar removes it |
| Profile Setup: Basic Details | Current city (auto-detected) | GET /cities/resolve?lat=&lng= → { city, distanceKm } then PATCH /me { homeCityId: city.id } | Without location permission, let the user search instead: GET /cities?q=lon&limit=10 (limit up to 20) |
| Profile Setup: Basic Details | Languages spoken | PATCH /me { extras: { languages: ['en', 'es'] } } | ISO 639-1 two-letter codes. The chips in Figma map to codes on the client |
| Profile Setup: Basic Details | Gender (not drawn) | PATCH /me { gender } | **(updated)** Optional per the GET /me description; woman, man, non_binary or prefer_not_to_say |
| Profile Setup: Travel Style | the style chips | **(new)** PATCH /me { extras: { travelStyles: [...] } } | A fixed list of 36 values (family, solo, foodie, backpacker, beach, hiking, nightlife, culture, digital_nomad and so on: see the TravelStyle type in the integration spec), up to 10. An empty list or null clears it. The old extras.lookingTo field is gone. Check the 40 Figma chips against the 36 values |
| Travel Interests ("What are you into?") | the interest chips | GET /interests for the list, then PATCH /me { interestIds: [...] } | The list comes from the server with id, slug, name and emoji. The API accepts 3 to 8; the screen says 5 to 8, so enforce 5 on the client if that is the product rule. Skip is allowed |
| Profile Setup: Favourite Locations | the city chips and search | **(new)** GET /cities/popular for the chips, GET /cities?q= for search, then PATCH /me { extras: { favouriteCityIds: [...] } } | Up to 10 cities. Read back as favouriteCities on GET /me and on other people's profiles |
| Loading screen after setup | Loading | GET /me | Confirms profileCompletedAt and gives the home city for the feed |

## 4. Home feed

The feed is one call. The city is chosen by the server from teleport (subscribers only), then the location header, then the network location, then the home city; the app never sends a city id to the feed.

| Figma screen | Element | API call | Notes |
| :---- | :---- | :---- | :---- |
| Home Feed | the card list | GET /feed?type=all&limit=20 with X-Client-Location: lat,lng | Answer: { city, citySource, items, nextCursor }. items are post cards: id, type, title, images (thumb, card, full URLs), startAt, endAt, recurrence, placeName, city, capacity, goingCount, rsvpState, saved, price, costSplit, host (name, avatar, verified), interests, distanceKm. Page with cursor=nextCursor |
| Home Feed | city name in the header ("Lagos") | from the feed answer | city.name and citySource (device, edge, home or **teleport**). For teleport show "Teleported to {city}" |
| Home Feed | filter chips | GET /feed?type=meetup / event / plan / group | The backend filters by post type only. The chips in Figma (Activities, Trips, Events, Food) do not match: see section 12 |
| Home Feed / Skeleton | loading | same call | Show the skeleton until the first page lands |
| Home Feed | 404 NO_CITY | none | Only possible when the user has no home city and no location. Send them to set a home city |
| Home Feed | pull to refresh | same call without cursor | Cards are cached server-side for 10 minutes, so a brand-new post may take a moment to appear |
| Home Feed | tap a card | GET /posts/:postId | See section 6 |
| Home Feed | heart / save icon | **(new)** POST /posts/:postId/save → 204; DELETE /posts/:postId/save → 204 | saved on the card says the current state. 409 on a draft or cancelled post. The list is GET /me/saved (section 9) |
| Home Feed | search | **(new)** GET /search/posts?q=&interestIds=&type= and GET /search/people?q= | Runs on submit, no typeahead. Posts: q 2 to 100 characters and/or up to 10 interest chips, in the feed's city. People: first name or handle. At most 100 results per search |
| Home Feed | bell / notifications | **(new)** GET /me/notifications, POST /me/notifications/read | Section 11 |
| Home Feed | Level, passport progress card | no endpoint | See section 12 |
| Choose City / Teleport sheet | city search, Popular row | **(updated)** GET /cities?q=, GET /cities/popular, then POST /me/teleport { cityId } → 204 | Teleport is now built. Needs a subscription: 402 PAYMENT_REQUIRED means show the paywall. DELETE /me/teleport returns home. Refetch feed and map after either |
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
| Schedule | Meeting point | placeName, lat, lng, **(new)** cityId | A Meetup or Event needs the pin to publish. A Plan or Group may skip it and send cityId (its destination, from GET /cities); without either it takes the host's home city. Send lat and lng together. A place search needs a map SDK on the phone; the API only stores the result |
| Schedule (Event only) | running order (not drawn) | **(new)** schedule (repeat the field, one line each) | Events only; a 400 on any other type |
| Schedule (Plan only) | itinerary / stops (not drawn) | **(new)** itinerary (repeat the field, one line each) | Plans only; a 400 on any other type. Replaces the old Plan checklist |
| Schedule (Group only) | repeats (not drawn) | **(new)** recurrence (weekly, biweekly, monthly), recurrenceEndsOn (date) | Groups only. A monthly Group must start on the 1st to the 28th. The server moves the date on after each meeting and keeps the people going |
| Participants | Capacity ("10 people") | capacity | Optional. Event: over 100 or none. Group: 1 to 100. Meetup and Plan: any |
| Participants | Open to everyone / Request to join | visibility | open or private. Private means people request and the host accepts |
| Participants | Show on map | showOnMap | true or false as text |
| Participants | waiting list (not drawn) | waitlistEnabled | true lets people queue when full. Worth a toggle |
| Participants | Invite friends | no endpoint | Share the post link, or after publishing the host can open the post's group chat (section 6) |
| Cost Sharing | Shared cost toggle, currency, amount, expected travellers | **(updated)** Plans and Groups: costTotalCents, costCurrency, expectedCount (all three or none) | The estimated split is now server-side: the card shows costSplit.perPersonCents ("about N each"). costTotalCents is in the smallest unit: NGN 60,000 is 6000000. A 400 on a Meetup or Event |
| Cost Sharing | ticket price (paid post) | priceCents, currency | Both or neither, the price per person in the smallest unit (USD 20 is 2000). currency is any upper-case ISO 4217 code. The price cannot change once the post is live |
| Cost Sharing | link to pay or book (not drawn) | externalUrl | https:// only, allowed only on a paid post. A paid Event cannot publish without one and books there (joinMode: external). A paid Meetup, Plan or Group may carry one and still joins with RSVP |
| Review | interests (not drawn) | interestIds (repeat the field, 1 to 3 ids) | Required to publish. Pick from GET /interests. Missing from every wizard in Figma: see section 12 |
| Review | Publish | status=published | 201 with the full post. Then show the Published / Success modal |
| Any step | Save draft | status=draft | 201. A draft needs only type and title. 20 drafts maximum (409 on the 21st) |

After a draft exists, edits go to PATCH /posts/:postId as JSON (any field but type and status; send null to clear), pictures to PUT /posts/:postId/images (multipart, the whole set in order), and publishing to POST /posts/:postId/publish.

Errors to handle on Publish:

* 400 VALIDATION_FAILED with an errors list naming every failed rule at once (date in the past, missing pin, fewer than 2 photos, no interests, Event capacity too low, paid Event without a link, a type-only field on the wrong type). Show them all on the Review step.
* 409 EVENT_MONTHLY_CAP: three Events per calendar month; details.resetsAt says when the cap resets. Show it in the error modal.
* 409 CONFLICT on the 21st draft.
* 413 image over 5 MB, 415 not an image.
* 403: the host is suspended.

## 6. Post detail, joining and attendees

Figma has no post detail screen yet; the Explore mini-card ("RSVP · Free", "27 joined · 13 left") is the closest. Every button on that card and on a future detail screen maps to the calls below.

| Element | API call | Notes |
| :---- | :---- | :---- |
| Open a post | GET /posts/:postId with X-Client-Location | The card fields plus description, status, schedule (Events), itinerary (Plans), isHost, rsvpState, waitlistPosition, linkClickCount (host only). 404 when the post is a draft of someone else, taken down, or the host blocked the viewer |
| Join button label | rsvpState and joinMode on the post | rsvpState is none, going, waitlisted, requested, declined or removed. joinMode is rsvp, or external on a paid Event, where the button opens externalUrl instead |
| Join / Request to join | POST /posts/:postId/rsvp → { state, goingCount, capacity, waitlistPosition } | Open post: going, or waitlisted when full and the waitlist is on. Private post: requested. 409 POST_FULL, POST_STARTED, POST_CANCELLED, EXTERNAL_BOOKING (paid Event: open the link), CONFLICT (own post, or the host declined you) |
| Leave / cancel request | DELETE /posts/:postId/rsvp → 204 | Frees the spot and promotes the next waitlisted person, who gets a push |
| Open the pay or book link | POST /posts/:postId/link-click → 204, then open externalUrl | Counts one click per person for the host |
| Save / unsave | **(new)** POST /posts/:postId/save, DELETE /posts/:postId/save | See section 4 |
| Who is going | GET /posts/:postId/attendees?state=going | Also requested and waitlisted (host only). Answer carries counts, and position in the queue for waitlisted people. On a private post only the host and people going can read the going list |
| Host: accept a request | POST /posts/:postId/attendees/:userId/accept | 409 POST_FULL when no spot is left and no waitlist; with a waitlist they join the line |
| Host: decline a request | POST /posts/:postId/attendees/:userId/decline | Final; the person cannot ask again and gets no push |
| Host: remove someone | POST /posts/:postId/attendees/:userId/remove | Final. They get a push |
| Host: edit | PATCH /posts/:postId, PUT /posts/:postId/images | A live post is re-checked against the publish rules on every edit. Price cannot change on a live post |
| Host: cancel | POST /posts/:postId/cancel | For a live post someone joined. Everyone going or waitlisted gets a push |
| Host: delete | DELETE /posts/:postId → 204 | Drafts and posts nobody joined. 409 POST_HAS_ATTENDEES otherwise: offer Cancel instead |
| Host: group chat | **(new)** POST /conversations { postId } | Host only; members are the host and everyone going, up to 50. See section 10a |
| Plan checklist | **(removed)** | PUT/PATCH checklist endpoints are gone from Swagger. Show the Plan's itinerary lines instead |
| Comments | **(new)** GET /posts/:postId/comments, POST /posts/:postId/comments { body, parentId? }, GET .../comments/:commentId/replies, DELETE .../comments/:commentId, POST .../comments/:commentId/report | One level of replies, oldest first, 1,000 characters. canDelete shows the delete button (own comments, or any on a post you host). deleted: true means show "Comment deleted". 409 POST_CANCELLED when writing on a cancelled post |
| Report this post | POST /posts/:postId/report { reason, details? } → 202 | details is required when reason is other. 409 if a report is already open. 403 REPORTING_PAUSED if a moderator paused the user's reporting |
| Share | build the link from the post id | The deep-link files in section 11 make `https://<links host>/posts/<id>` open the app |

## 7. Explore

The map shows the pins of the same city the feed picked. Pan and zoom change the box you ask for, not the city.

| Figma element | API call | Notes |
| :---- | :---- | :---- |
| Map pins | GET /map/pins?bbox=west,south,east,north&type=meetup with X-Client-Location | Up to 500 pins: { id, type, lat, lng, title, startAt }. The box must be under 5 degrees wide (400 otherwise). Debounce on camera idle. type optional |
| Type chips (Meetup, Event, Plan, Group) | the type query | One type at a time, or none for all |
| Search on the map | **(new)** the q query on GET /map/pins | Up to 80 characters; keeps the pins whose title contains it |
| Tap a pin → mini card | GET /posts/:postId | The card needs the image, going count and rsvpState; the pin alone does not carry them |
| RSVP · Free on the mini card | POST /posts/:postId/rsvp | Section 6 |
| Search city or country | GET /cities?q= to move the camera | Pins still come from the picked city only. To see another city's pins, teleport (section 4) |
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

Waitlisted posts are not covered by /me/rsvps (it takes going or requested only); see section 12. The old dated city visits (/me/trips) are no longer in Swagger.

## 9. Profile

The own profile reads from GET /me; another person's profile reads from GET /users/:userId. The badges, stamps, streaks and the three counters at the top have no API yet.

| Figma screen | Element | API call | Notes |
| :---- | :---- | :---- | :---- |
| Profile / Own Profile | name, handle, city, bio, chips, photo | GET /me | handle, avatarUrl, homeCity, bio, interests, extras (languages, travelStyles, social links, pronouns, tagline), favouriteCities, photos, visiting, verified, subscribed |
| Profile / Own Profile | Events, Countries, Streak counters | no endpoint | Section 12 |
| Profile / Own Profile | Edit Profile | Settings / Edit Profile, section 10 |  |
| Profile / Own Profile | Share | deep link `https://<links host>/users/<handle>` |  |
| Profile / Own Profile | Going / Requested tabs | **(updated)** GET /me/rsvps?state=going / requested | Same as the Trips tab. Hosted posts: GET /me/posts?status=published. Attended: GET /me/attended |
| Profile / Own Profile | Saved (not drawn here) | **(new)** GET /me/saved?type=all|meetup|event|plan|group | Newest save first; cancelled posts stay listed |
| Profile / Own Profile | Achievements, See all, badge detail | no endpoint | Section 12 |
| AJALA Stamps screen | stamps, Lagos journey, events attended | no endpoint | GET /me/attended gives the attended list, but nothing groups it by city or counts experiences. Section 12 |
| Profile / Other User | header and bio | GET /users/:userId or GET /users/handle/:handle | **(updated)** favouriteCities, openToMeetToday, sharePlans, memberSince, blockedByMe. ageBand is gone. homeCity is null when they hide their city. 404 when the person is suspended, deleted, or has blocked the viewer |
| Profile / Other User | their posts grid | GET /users/:userId/posts?limit=20 | Live posts only, latest date first |
| Profile / Other User | posts they attended | GET /users/:userId/attended?limit=20 |  |
| Profile / Other User | their upcoming plans | **(new)** GET /users/:userId/plans | Open posts they are going to, soonest first. Empty unless sharePlans is on |
| Profile / Other User | Message | **(new)** POST /conversations { userId } | Returns the existing direct chat or a new one. 403 when they only take messages from people they share a post with; 429 CHAT_START_LIMIT on too many new chats in a day |
| Profile / Other User | Follow | no endpoint | Section 12 |
| Bottom Sheet Panel (the ⋯ menu) | Block | POST /users/:userId/block → 204; DELETE /users/:userId/block to unblock | Blocked people disappear from the feed, attendee lists and search both ways, and a direct chat ends |
| Bottom Sheet Panel | Report | POST /users/:userId/report { reason, details? } → 202 | details required when reason is other. 403 REPORTING_PAUSED |
| Photo gallery (not drawn, exists in the API) | up to 6 photos | POST /me/photos (multipart file), DELETE /me/photos/:photoId, PUT /me/photos/order { ids } | Worth adding to the profile designs |
| Verified badge | verified on cards and profiles | none | **(updated)** The selfie verification endpoints are gone from Swagger; verified is set by an admin. Show the badge only |

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
| Settings / Edit Profile | Display name, username, current city, bio | PATCH /me { firstName, lastName, handle, homeCityId, bio } | Handle changes once every 30 days (409 HANDLE_COOLDOWN). Check GET /handles/availability?handle= first |
| Settings / Edit Profile | Languages spoken: Manage | PATCH /me { extras: { languages: [...] } } | Send the whole list each time |
| Settings / Edit Profile | Travel style: Manage | **(new)** PATCH /me { extras: { travelStyles: [...] } } | Up to 10 of the fixed list |
| Settings / Edit Profile | Favourite destinations (not drawn here) | **(new)** PATCH /me { extras: { favouriteCityIds: [...] } } | Up to 10 |
| Settings / Edit Profile | Interests (not drawn here) | PATCH /me { interestIds } | 3 to 8 ids |
| Account & security | Email | re-auth, then POST /me/email/change { newEmail } → 202, then POST /me/email/change/confirm { code } → 204 | The code goes to the new address; the old one gets a notice. Other devices are signed out on confirm |
| Account & security | Change password | POST /me/password { currentPassword, newPassword } → 204 | Other devices are signed out. Google or Apple accounts with no password use POST /me/password/set { newPassword } after re-auth |
| Account & security | Connected accounts (Apple, Google) | read identities on GET /me; **(new)** DELETE /me/identities/:provider to unlink | **(updated)** Each identity now has provider only (verifiedAt is gone). Linking happens by signing in with that provider (section 1, the 409 flow). Unlink needs re-auth; 409 LAST_SIGN_IN_METHOD when it is the only way in, so offer "set a password" first |
| Account & security | Sign-in activity | GET /me/sessions; DELETE /me/sessions/:sessionId | Device name, IP country, started, last used, current. Deleting one signs that device out |
| Account & security | Delete account | re-auth, then DELETE /me { reason? } → 202 { purgeAt } | 14-day grace, every device signed out. Signing in again before purgeAt cancels it |
| Settings / Drafts | list, filter chips | GET /me/posts?status=draft | Filter by type on the client |
| Settings / Drafts | Continue editing | PATCH /posts/:postId, PUT /posts/:postId/images, POST /posts/:postId/publish | Section 5 |
| Settings / Drafts | Delete | DELETE /posts/:postId → 204 |  |
| Settings / Notifications | Join Request | PATCH /me/settings { notifyJoinRequest } | Read current values from GET /me/settings |
| Settings / Notifications | Plan Updates | PATCH /me/settings { notifyRequestAccepted, notifyPostReminder } | Two toggles in the API behind one switch in Figma: set both |
| Settings / Notifications | New Messages | PATCH /me/settings { notifyNewMessage } | **(updated)** Chat is now built (section 10a) |
| Settings / Notifications | Nearby Activity, Recommendations | no field | Section 12. Other stored toggles with no screen: notifyNewComment, notifySubscription. **(updated)** marketingEmails is gone |
| Settings / Appearance | System, Light, Dark | none | Client-only |
| Privacy & Safety | Profile visibility | PATCH /me/settings { hiddenFromSearch } | **(updated)** showAge is gone |
| Privacy & Safety | Show current city | **(new)** PATCH /me/settings { showCurrentCity } | Off makes homeCity null on the public profile |
| Privacy & Safety | Open to meet today | **(new)** PATCH /me/settings { openToMeetToday } | Switches itself off at the user's midnight. Shows on the public profile |
| Privacy & Safety | Share my plan | **(new)** PATCH /me/settings { sharePlans } | Lists the upcoming open posts the user is going to on their profile (GET /users/:userId/plans). This is public sharing, not a trusted-contact feature: see section 12 |
| Privacy & Safety | Messages: who can message me, read receipts (not drawn) | **(new)** PATCH /me/settings { dmPermission: anyone | shared_only, readReceipts } |  |
| Privacy & Safety | Blocked accounts | GET /me/blocks?limit=20; DELETE /users/:userId/block |  |
| Privacy & Safety | Reports | **(new)** GET /me/reports | Posts, people, comments and messages the user reported, newest first, with status open, resolved or dismissed. The text written is not returned |
| Privacy (not drawn) | Usage analytics on or off | PATCH /me/analytics { enabled } | Required for the privacy policy |
| Privacy (not drawn) | Download my data | re-auth, then POST /me/export → 202; GET /me/export for downloadUrl when ready | One export per 24 hours (409). 403 EMAIL_NOT_VERIFIED without a verified email. Worth a row under Account & security |

## 10a. Messages (new)

Chat is built. Figma screens for it were not part of the original map; these are the calls.

| Element | API call | Notes |
| :---- | :---- | :---- |
| Inbox list, tabs All / Unread / Groups, search | GET /conversations?tab=&search= | Latest activity first, with lastMessage (120-character preview) and unreadCount (up to 99) |
| Open a chat | GET /conversations/:id, then GET /conversations/:id/messages?before=&limit=30 | Members with online and how far each has read. Messages newest first; send the oldest id you hold as before for more |
| Send | POST /conversations/:id/messages (multipart: clientMsgId, body, taggedPostId, images) | clientMsgId is a uuid the app makes; a retry with the same one returns the first message. Up to 2,000 characters and 4 pictures. Picture links last an hour |
| Read receipts, typing | POST /conversations/:id/read { messageId }; POST /conversations/:id/typing | Typing at most every 3 seconds, shown for 5 |
| Live updates | socket /chat: message.new, read.update, typing | Refetch the thread when it opens; a missed event costs nothing |
| Group members | POST /conversations/:id/members { userId }; DELETE /conversations/:id/members/:userId | Host adds people going to the post; anyone can remove themselves; the host cannot leave |
| Report a message | POST /conversations/:id/messages/:messageId/report | Same reasons as a post |
| Message states | removed: true, taggedPostUnavailable: true | Show "This message was removed" and "no longer available" |

## 11. App-level calls

Five things sit outside any screen: app config at launch, terms acceptance, push registration, the notification inbox and deep links.

| When | API call | Notes |
| :---- | :---- | :---- |
| App launch, before any screen | GET /app/config (public, cacheable 5 minutes) | { termsVersion, termsUrl, privacyUrl, faqUrl, supportEmail, minAppVersion: { ios, android } }. Compare the build number to minAppVersion and block with a force-update screen when older |
| After sign-in, when GET /me says termsUpToDate: false | show the terms, then POST /me/terms/accept { version } → 204 | version is the termsVersion from app config. Sign-up already records acceptance through termsVersion in its body |
| After sign-in and whenever the push token changes | POST /me/devices { token, platform, appInstanceId?, timezone, deviceId } → 204 | platform is ios or android. The call also stores the timezone, which push reminders use |
| On sign-out | POST /me/devices/unregister { token } → 204 | Before POST /auth/logout |
| Push arrives | read the payload | **(updated)** The payload matches the inbox item's data: kind and usually postId. Route to the post detail or the chat |
| Notifications screen and badge | **(new)** GET /me/notifications?unread=false|true; POST /me/notifications/read { ids? } | Last 90 days, newest first, including pushes switched off in Settings. unreadCount is the badge. Leave ids out to mark everything read. category picks the icon: join_request, request_accepted, post_reminder, new_comment, new_message, subscription, post_update, moderation |
| Deep links | `https://<links host>/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` are served by the API | You supply the Apple team id and bundle id, the Android package name and the SHA-256 signing fingerprint; they are set in the API's config. Paths to handle: post links, profile links, the web checkout return |

## 12. Designed but not in the backend yet

These elements appear in Figma and have no API today. Build the screens with the data hard-coded or hidden behind a flag, and treat the last column as the open question for the product owner.

**Resolved in the Nov 3 sync and removed from this list:** posts I joined or requested (/me/rsvps), password reset by code, travel style chips (extras.travelStyles), favourite locations (extras.favouriteCityIds), Teleport and the subscription, heart / save, Show current city and Open to meet today, My reports list, unlinking a connected account, the shared cost split (now server-side).

| Element | Where in Figma | What exists today | Open question |
| :---- | :---- | :---- | :---- |
| Waitlisted posts in the Trips tab | Trips / Upcoming | /me/rsvps takes going or requested only | Add state=waitlisted, or show waitlisted posts under Upcoming from another source? |
| Full Name as one field | Create Account | firstName and lastName | Two fields in the design, or split on the client |
| Gender | not drawn | Optional per GET /me, but MeDto.profileCompletedAt still lists it | Backend to confirm whether gender gates profileCompletedAt; add a field to Profile Setup either way |
| Travel style chips (40 in Figma) | Profile Setup, Edit Profile | 36 fixed travelStyles values | Map the Figma chips to the 36 values; drop or add the difference |
| Interests on a post | missing from every create wizard | 1 to 3 interests are required to publish | Add an interests step to the wizard |
| Event schedule, Plan itinerary, Group recurrence, end time | not drawn | schedule, itinerary, recurrence, endAt | Add to the wizards. Backend to state the max number of lines (the Swagger text says "up to lines" with the number missing) |
| Plan checklist with ticks | not drawn | removed from the API; itinerary is read-only lines | Is the tickable checklist dropped for good? |
| Feed filter chips (Activities, Trips, Events, Food) | Home Feed | filter by post type only; search by interest chips | Map chips to the four types, or to interest searches |
| Level, passport, stamps, badges, achievements, streaks | Home Feed card, Profile, Stamps screen | attended list only | A gamification feature of its own. Hide for launch or show static placeholders |
| Events / Countries / Streak counters | Profile header | nothing | Could be derived later from attended posts; not available now |
| Follow | Other User profile | nothing | Follows are not in the requirements; block, report and message are |
| Invite friends, Invite offline friends | Create wizard, Participants step | share link; host group chat | Share the post link instead |
| Waiting list toggle, pay or book link | not drawn | waitlistEnabled, externalUrl | Add both to the Participants and Cost Sharing steps |
| Post detail screen | not drawn | GET /posts/:postId, every join action, comments, save | Needed before the feed cards can open anything |
| Messages screens | not in the original map | the whole chat API (section 10a) | Confirm the designs exist |
| Nearby Activity, Recommendations toggles | Notifications | six other push toggles | Map to existing toggles or add two |
| Share my plan with a trusted contact | Privacy & Safety | sharePlans lists plans publicly on the profile | Is public sharePlans enough, or is a private trusted-contact share still wanted? |
| Dated trips ("visiting") | Profile | removed from Swagger, though visiting is still on profiles | Were trips dropped? If not, the endpoints need to return to the docs |
| Selfie verification | not drawn | removed from Swagger; verified set by an admin | Dropped for good, or coming back? |
| Step-up code screen on sign-in | not drawn | 403 STEP_UP_REQUIRED | Reuse the Verification screen |
| Account-link code screen for Google and Apple | not drawn | 409 ACCOUNT_LINK_REQUIRED | Reuse the Verification screen |
| Photo gallery, data export, analytics toggle, messaging privacy, subscription screen | not drawn | all built | Add to Edit Profile, Account & security and Privacy |
