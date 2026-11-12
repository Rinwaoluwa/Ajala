# How to test: 12 Nov changes (distance lock, 18+, city header, destinations, chat links, local post search, paywall, search fields, filters)

**Changes:** 12 Nov 2026 · **Backend requirement:** MOB-077 (far-away posts locked for free members) · **Servers:** staging (or dev)

You need a build or update that contains these changes. Older builds behave as before.

## Before you start

- **Accounts on staging** (the older QA accounts no longer sign in):

  | Account | Email | Password | Notes |
  | --- | --- | --- | --- |
  | Free member | `mrcnsfux@guerrillamailblock.com` | `QaStaging2026Ok!` | Home city London. Not Pro. |
  | Host in Lagos | `qpzpozmr@guerrillamailblock.com` | `QaHost2026Ok!` | Hosts "Suya night in Lagos (QA)". |

- **The far post:** "Suya night in Lagos (QA)", id `81c468bd-129f-4d62-84a1-ae45cf83db70`. It is far away for anyone more than 150 km from Lagos.
- **Setting the phone's location:**
  - iOS Simulator: **Features → Location → Custom Location**. London is `51.5074, -0.1278`; Lagos is `6.4530, 3.3960`.
  - Android emulator: **⋯ → Location**.
  - Real phone: test from wherever you are. Only the Lagos-side checks need someone in Lagos, or a simulator.
- **Location permission:** allow Ajala to use location "While using the app", unless a step says to turn it off.

## 1. City in the Home header

| # | Do this | You should see |
| --- | --- | --- |
| 1.1 | Sign in with location on, in London. Open Home. | The header reads **London**, with "Exploring your current city" under it. Before this change it read **England**. |
| 1.2 | Move the location to another city (for example Manchester, `53.4808, -2.2426`) and pull down to refresh Home. | The header changes to that city's name. |
| 1.3 | Open Travel (the city name in the header). | "Where you are" shows the same city name. |
| 1.4 | Teleport to a city (Pro only). | The header shows the teleport city as before ("Teleported to …"). |

For a moment while it loads, the header may show the region (for example "England"). It should switch to the city within a second or two.

## 2. Sign-up is 18 and over

| # | Do this | You should see |
| --- | --- | --- |
| 2.1 | Sign up → Email address. Pick a date of birth that makes you **17** (for example, today's date 17 years ago). | A red message under the field: **"You must be 18 or older to join Ajala."** Continue stays greyed out, even with every other field filled in. |
| 2.2 | Change the date to **exactly 18 years ago today**. | The message goes away. Continue lights up once the other fields are filled in. |
| 2.3 | Sign up with Google or Apple using an account that has no date of birth. At "Set up your profile", pick a date that makes you 17. | The same red message, and Continue stays greyed out. |

The app only blocks the form. The backend has been asked to refuse under-18 accounts as well.

## 3. Far-away posts are locked for free members (MOB-077)

Sign in as the **free member**, with the location in **London**, unless a step says otherwise.

### Opening a far post

| # | Do this | You should see |
| --- | --- | --- |
| 3.1 | Open the far post from a link, for example by sending yourself `https://staging-go.ajalatrvl.com/posts/81c468bd-129f-4d62-84a1-ae45cf83db70` and tapping it. | A lock icon, **"This is outside your area"**, and a **Go Pro** button. Not an error screen. |
| 3.2 | Tap **Go Pro**. | The paywall, titled **"See posts anywhere"**. |
| 3.3 | Set the location to **Lagos** and open the same link. | The full post opens. |
| 3.4 | Turn Ajala's location **off** in Settings, then open the link again. | **"Turn on location"** with a button. It is not the paywall. Tap the button: the system asks, or Settings opens if location is blocked. Once location is on, the post loads. |

### Locked cards

| # | Do this | You should see |
| --- | --- | --- |
| 3.5 | Back in London, open the host's profile ("Lagos H.": in Lagos, tap the host on the post from 3.3, then move the location back to London and pull to refresh). Look under **Hosting**. | The post's card has a **blurred photo**, the city and date, **"Outside your area"** with a lock, and **"Go Pro to open ›"**. There is no place name and no "N joining". |
| 3.6 | Tap the card. | The paywall opens straight away, without opening the post first. |
| 3.7 | Save the post while in Lagos, then go back to London and open **Profile → Saved**. | The card is blurred and locked. The bookmark still shows, so you can unsave it. Tapping the card opens the paywall. |

### Joined posts stay open

| # | Do this | You should see |
| --- | --- | --- |
| 3.8 | In **Lagos**, join (RSVP) the post. Then move back to **London**. | The post still opens, and it shows unlocked on the profile and in Saved. |
| 3.9 | Leave the post from London. | It locks again: the card and the link behave as in 3.1 and 3.5. |

### Chat

| # | Do this | You should see |
| --- | --- | --- |
| 3.10 | As a **Pro** member, send the free member a message that tags the Lagos post. | For the free member, the thread still loads. The tagged post shows a lock and **"Outside your area · Go Pro to open"**, and tapping it opens the paywall. |
| 3.11 | As the free member in London, try to tag the Lagos post in a message. | The message is not sent: "That post is outside your area. Go Pro to share posts from anywhere." |

### Pro members

| # | Do this | You should see |
| --- | --- | --- |
| 3.12 | Repeat 3.1 and 3.5 with a Pro account. | Everything opens from anywhere. No locks. |

## 4. Favourite destinations find countries and regions

| # | Do this | You should see |
| --- | --- | --- |
| 4.1 | Profile setup → "Where do you love to travel?", or Settings → Edit profile → Favourite destinations → Manage. Search **Qatar**. | **Qatar** is the first result. Before this change, only towns such as "Katar, Rajasthan" came up. |
| 4.2 | Search **Bali**. | **Bali, Indonesia** is the first result. |
| 4.3 | Pick both and save. Reopen the screen. | Both are kept. |
| 4.4 | Travel (Pro): search **Qatar** to teleport. | Only cities, as before. Teleport and the home city still take cities only. |

## 5. Ajala links in chat

| # | Do this | You should see |
| --- | --- | --- |
| 5.1 | In any chat, receive a message with an Ajala post link, for example `https://staging-go.ajalatrvl.com/posts/81c468bd-129f-4d62-84a1-ae45cf83db70`. | The link is underlined and in colour. Other links (`https://example.com`) are too. |
| 5.2 | Tap the Ajala link. | The post opens inside the app, not in a browser. As a free member in London it shows "This is outside your area". |
| 5.3 | Tap a non-Ajala link. | It opens in the browser. |
| 5.4 | In the compose box, type or paste a post link (`go.ajalatrvl.com/posts/<id>`) or a profile link (`…/users/<id>`). | A small **"Ajala post · Open ›"** or **"Ajala profile · Open ›"** appears above the field. Tapping it opens that post or profile in the app. Sending still works as normal. |

Links from all three hosts (`go.`, `staging-go.`, `dev-go.ajalatrvl.com`) and `ajala://` links are recognised.

## 6. Free members only find places near them when posting

| # | Do this | You should see |
| --- | --- | --- |
| 6.1 | As the **free member** in London, start a Meetup and reach the meeting point. Search **Eko Hotel**. | No Lagos results. Places are offered only within about 50 km of the phone. |
| 6.2 | Search **Oxford Street**. | London results, as normal. |
| 6.3 | Do the same as a **Pro** member. | Places anywhere, as before. |
| 6.4 | As a free member, publish with location turned off. | "Turn on location to post. Ajala checks your post is near where you are." |

## 7. Paywall, search fields and the Explore filters

| # | Do this | You should see |
| --- | --- | --- |
| 7.1 | Tap **Go Pro** on a locked post, or Unlock on a Plan. | The paywall slides up full screen, the same way Travel opens from the city in the Home header. "Maybe later" slides it back down. The clock and battery are white on it. |
| 7.2 | On the paywall, tap **Subscribe**. Also tap a non-Ajala link in a chat. | Each opens in the in-app browser over Ajala, not in Safari or Chrome. App Store and Play subscription settings still open the store app. |
| 7.3 | Type in any search field: Explore, Messages, Travel, destinations, a post's place, interests. | An **×** appears at the right end. Tapping it empties the field at once, and the results clear. |
| 7.4 | With a search field focused and the keyboard up, tap anywhere outside it (the map, a heading, empty space). | The keyboard goes away. Tapping a result still picks it. |
| 7.5 | Explore → filter icon. | Date, Price and **Maximum price** are one-tap boxes: No limit, ₦5,000, ₦10,000, ₦25,000, ₦50,000, Custom. No keyboard is needed for these. |
| 7.6 | Tap **Custom**. | A ₦ field appears with the number pad. The sheet rises so the field, Reset and Apply sit above the keys. |
| 7.7 | Tap outside the field (a heading in the sheet). | The number pad closes and the sheet settles back down. **Apply filters** applies the typed maximum. |

## If something looks wrong

Note the screen and the time, and take a screenshot. For a post that will not open, also note the post's link. In development builds the reason is in the Metro log as a `[api] … → 402 PAYMENT_REQUIRED` or `400 NO_LOCATION` line, with a request id to send to the backend.
