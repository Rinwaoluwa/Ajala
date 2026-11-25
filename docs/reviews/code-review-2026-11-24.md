# Code review: regressions, redundancy and complexity

24 Nov 2026, branch `feat/design-system-onboarding` at commit `24d092b`.

## How this was done, and what it does not cover

- **Whole app, by script.** Every `.ts` and `.tsx` file under `src/` and `app/` (760 files, about 67,000 lines, 48,000 of them code) was scanned for: file and function size, state and effect counts, lint suppressions, loose types, timers, exports and files nothing uses, blocks repeated across files, names defined in more than one feature, switched-off and commented-out code, and every API call.
- **By reading.** Home, Explore, the shared post cards, the page swipe, the query cache and the Join code were read in full. Each finding below from those areas was checked against the code.
- **Not read line by line:** auth, onboarding, chat, settings, notifications, payment and most of profile. Findings there come from the scans (sizes, duplicates, unused code) and are marked "by scan". A reviewer reading those features would find more.
- **Nothing was run.** No finding here was reproduced on a device. Where a bug is described, it was found by reading the code.

The scans and their numbers are at the end so they can be repeated.

## Fix these first

| # | What | Why first |
|---|---|---|
| 1 | Join is written three times and the three do not tell each other ([R1](#r1-join-is-written-three-times-and-the-three-do-not-agree)) | A person can join on the post's page and still see "Join" on its card, or leave on the page and still see "Going" |
| 2 | One post is kept under two cache keys, and every Home card asks for its comment count ([R2](#r2-a-post-is-read-again-for-every-card-under-three-different-keys)). Half of this was fixed later the same day: cards no longer read the post for its description | Every card on Home costs one extra request; a post seen on the map is asked for again when it is opened |
| 3 | There are no screen or component tests ([R6](#r6-nothing-tests-a-screen)) | Today's blank-screen crash and every layout regression can only be caught by hand |
| 4 | Profile and Settings each hold their own copy of the same profile rules, types and use cases ([D2](#d2-profile-and-settings-are-two-copies-of-the-same-thing)) | A rule changed in one is silently wrong in the other |
| 5 | About 600 lines of switched-off or unreachable code ([D7](#d7-code-that-is-switched-off-commented-out-or-unreachable)) | It is read, type-checked and maintained, and it hides what the screens really do |
| 6 | `ExploreScreen` is one 370-line component with 14 pieces of state ([S1](#s1-explorescreen)) | Every Explore change touches it, and three lint rules are already switched off inside it |

---

## 1. Regressions and behaviour that does not hold together

### R1. Join is written three times, and the three do not agree

- **Where:** `src/shared/hooks/useRsvpPost.ts` (the pill on a card), `src/features/explore/presentation/hooks/useJoinPost.ts` (the map's mini card), `src/features/post-detail/presentation/hooks/usePostDetail.ts:66` (the post's page).
- **What happens:** a card decides what to show with `override ?? initialState` (`useRsvpPost.ts:33`). The override lives in `src/shared/state/postRsvps.ts` for as long as the app runs. Only the card's own pill writes it. The post page's mutation updates the page's cache entry and the attendee lists, and nothing else; the mini card's updates only `['explore', 'post', id]`.
  - Join on the post's page, go back: the feed card still says **Join**, because its list was not refreshed and no override was written.
  - Join from a card, then leave on the post's page: the card keeps saying **Going** until sign-out or restart, because the override still says so and it wins over the server's answer.
  - Join from the map's mini card: the same post in the list under it still says **Join**.
- **Smallest fix:** make the post page and the mini card use `useRsvpPost` (or at least call `postRsvps.set` on success and on leave). One Join, used three times.
- **Confidence:** high that the state is not shared (read in all three files). Not reproduced on a device.

### R2. A post is read again for every card, under three different keys

- **Where:** `src/features/home/presentation/hooks/useCardDescription.ts` (key `['home', 'postDescription', id]`), `src/features/explore/presentation/hooks/usePostDescription.ts` (key `['explore', 'post', id]`), `src/features/post-detail/presentation/state/postDetailQueries.ts:7` (key `['postDetail', 'post', id]`), and `useCardCommentCount` on Home.
- **What happens:** the lists do not carry a description or a comment count (backend requests B10, B11), so each card asks for them. Since today every card in the Explore list does too, not only the ones without a photo. The same `GET /posts/:id` answer is kept three times, so opening a post you just saw on Home and in Explore asks for it a third time.
- **Also inconsistent:** Home's description is excluded from the saved cache (`persist.ts`, `NOT_SAVED`), Explore's is saved.
- **Smallest fix:** one shared hook and one key for "a post by id", used by all three; the description and the comment count read from it. The real fix is B10 and B11 on the backend.
- **Changed later on 24 Nov:** cards no longer show the host's words, so `useCardDescription` and `usePostDescription` are deleted, with the `['home', 'postDescription', id]` key and its `NOT_SAVED` entry. What is left of this finding: the map's mini card and the post's page still keep the same `GET /posts/:id` answer under two keys (`['explore', 'post', id]`, `['postDetail', 'post', id]`), and each Home card still asks for its comment count (B11).

### R3. Three wordings for the same button

A private post says **Request** on Home (`src/features/home/presentation/copy.ts:29`), **Join** in Explore (`src/features/explore/presentation/copy.ts:83` and `:97`) and **Request to join** on its own page (`src/features/post-detail/presentation/copy.ts:49`). Only Explore was changed when the label overflowed.
just make everything: **Join**

### R4. What the new cards dropped

These follow the 24 Nov design, so they may be intended, but they are things the app did last week:

- Home no longer shows who is hosting or how far away a post is, and a host's profile cannot be opened from the feed. `onOpenHost` was removed from the route (`app/(app)/(tabs)/index.tsx`).
- The Explore list no longer shows "5 going · 7 km away".
- Tapping a photo opens it full screen on Home and opens the post in the Explore list.

### R5. Screens that did not move to the new card

**Fixed on 25 Nov:** Saved activities now draws Home's card, and the older shared `PostCard` is deleted. What follows is the finding as it was written.

`SavedActivitiesScreen` is now the only user of the older shared `PostCard` (`src/shared/components/post/PostCard.tsx`, 466 lines), which writes time on a 24-hour clock (`formatCardTime`) where the new card writes "6:00 PM". Profile and Trips have their own cards as well. See [D4](#d4-eight-ways-to-draw-a-post).

### R6. Nothing tests a screen

There are 77 test files and 752 tests, all of rules, mappers and repositories. There is no `.test.tsx` file and no test renders a component. Layout, wiring between a screen and its hooks, and anything a tap does are checked by hand, and so far only on iOS: the page swipe, the new cards and the map search have not been run on Android.

Today's example: a card read `post.images.length` on lists cached before `images` existed, and the screen went blank. A single render test with an old-shaped post would have caught it.

### R7. Smaller loose ends

- **Notifications with nowhere to go.** `targetOf` returns `null` for `trusted_person` and `moderation` (`src/features/notifications/domain/rules/notificationRules.ts:68`): the row is drawn and has no destination.
- **The saved cache depends on memory.** `CACHE_SHAPE` (`src/core/api/queryClient/persist.ts`) has to be raised by hand whenever a cached shape changes. Nothing reminds anyone.
- **Map pins keep their old size** when the text size changes while the map is open; they are redrawn only when their data changes. (Seen while testing today; it was there before.)
- **`onViewLevel`** is still passed from the route to `HomeScreen` although the level card is switched off (see D7).

---

## 2. Redundant code

### D1. The same API types, declared again in each feature

Each feature declares its own copy of types the API defines once. By scan:

| Name | Declared in |
|---|---|
| `InterestDto` | create-post, explore, home, post-detail, profile, settings (6) |
| `HostCardDto` | chat, explore, home, post-detail, profile (5) |
| `PostType` / `PostTypeDto` | explore, home, post-detail, settings / create-post, explore, home, trips |
| `RsvpState` / `RsvpStateDto` | explore, home, post-detail, shared / explore, home, post-detail, trips |
| `PostImageDto`, `PostPriceDto`, `PostRecurrenceDto` | explore, home, post-detail, trips (4 each) |
| `MeDto` | auth, post-detail, profile, settings (4) |
| `PostCardDto`, `PostDetailDto`, `PostPrice`, `Recurrence` | 3 features each |

The longest literal repeats: `exploreDtos.ts:71` and `feedDtos.ts:72` (34 lines), `feedDtos.ts:78`, `exploreDtos.ts:76` and `postDetailDtos.ts:48` (15 lines).

The helpers follow the types: `toInterest` and `makeListInterests` exist four times, and `GET /interests` is cached under four keys (`['profile' | 'explore' | 'createPost' | 'settings', 'interests']`), so the same list is fetched up to four times.

**Smallest fix:** a `src/shared/api` (or `@core/api/dto`) module for the DTOs every feature reads, and one `useInterests`.

### D2. Profile and Settings are two copies of the same thing

Profile setup (`src/features/profile`) and Edit profile (`src/features/settings`) each carry their own:

- entity: `profile/domain/entities/Profile.ts:16` and `settings/domain/entities/Settings.ts:19` share a 37-line block, and `profile/data/dto/profileDtos.ts:24` repeats it a third time;
- travel styles: `profile/domain/rules/profileSetupRules.ts:54` and `settings/domain/rules/travelStyles.ts:12` (37 identical lines);
- rules and limits: `LANGUAGES`, `TRAVEL_STYLES`, `NAME_MAX`, `HANDLE_MIN`, `HANDLE_MAX`, `hasBadNameCharacters`, `POPULAR_DESTINATION_SEARCHES`;
- use cases: `makeUploadAvatar`, `makeCheckHandle`, `makeSearchDestinations`, `toCitySuggestion`;
- DTOs: `ProfilePhotoDto`, `UpdateProfileDto`, `PublicProfileDto`, `HandleAvailabilityDto`.

Auth has a third copy of the name rules (`splitFullName`, `isFullNameValid`, `toCalendarDate` in both auth and profile) and `isPasswordValid` is in both auth and settings.

### D3. Four report dialogs

`ReportMessageDialog` (chat), `ReportCommentDialog` (post-detail), `ReportProfileDialog` (profile) and `ReportActivityDialog` (explore) share blocks of 14 to 17 lines each, and `REPORT_DETAILS_MAX` is declared four times, `canSubmitReport` twice. One dialog taking the reasons and a submit function would replace all four.

### D4. Eight ways to draw a post

**Four since 25 Nov** (`PostListCard`, `MiniPostCard`, `ActivityCard` with its `TextPostCard`, `DraftCard`)**:** Trips moved to `PostListCard` too, and its two cards are deleted. Before that, Saved activities moved to `PostListCard` and the old `PostCard` (with its copy of the type names) is deleted; the profile's own lists went (My posts is a Trips pill), and `ProfilePostCard` with them.

`PostListCard` (Home, Explore list), `PostCard` (Saved), `MiniPostCard` (map), `ProfilePostCard` and its `TextPostCard`, `ActivityCard` (profile lists), `UpcomingTripCard`, `PastTripCard` (Trips, which share two 8-line blocks) and `DraftCard` (settings). They disagree on the clock (24-hour or 12-hour), on whether the year is written, and on how a post without a photo looks.

The post type's name is written out seven times: `home/presentation/copy.ts:57`, `explore/presentation/copy.ts:174`, `profile/presentation/profileViewCopy.ts:102`, `post-detail/presentation/copy.ts:7`, `trips/presentation/copy.ts:18`, `settings/.../DraftCard.tsx:21`, `shared/components/post/PostCard.tsx:67`.

### D5. Dates and money formatted in nine places

27 `Intl.DateTimeFormat` instances in 9 files. `formatDay`, `formatShortDay`, `formatTime`, `formatMoney` and `formatPrice` each exist in two features (create-post, explore, post-detail, profile), next to the shared `formatPost.ts`, trips' `tripTime` and chat's `listTime`.

### D6. Four pagers and two sets of dots

- `Pager` (onboarding, stamps, `PhotoViewer`, `ImageCarousel` on the post page), with `PaginationDots`;
- `CardPhotos` (the new card's photos), with its own dots;
- `SwipePager` (the four tabs);
- `SwipeSwitch` (the profile's lists). Deleted on 25 Nov with those lists.

`CardPhotos` could be a `Pager`. The last two are different gestures and are fair as separate pieces.

Also by scan: Explore and post-detail each have `makeJoin`, `toRsvpResult`, `spotsLeft`, `asSeenBy`, `makeRecordLinkClick`, `PostPreview`, `RsvpResult` and `formatPrice`; `useCitySearch` is in home and profile, `usePlaceSearch` in create-post and explore, `makeSearchCities` in three features; the auth screens (`ForgotPasswordScreen`, `NewPasswordScreen`, `SignInScreen`, `SignUpDetailsScreen`) and profile's `SetupScreen` share blocks of 10 to 29 lines.

### D7. Code that is switched off, commented out or unreachable

| What | Where | Size |
|---|---|---|
| Results listed under the map's search field, and the cities and people under them (`RESULTS_HERE`, `SUGGESTIONS_ENABLED`, both `false`) | `src/features/explore/presentation/components/MapSearchBar.tsx` from about line 205 | about 250 lines, plus `showOnMap` and `FOUND_SPAN` in `ExploreScreen.tsx` and a dozen strings in `exploreCopy.map` |
| The level card | `src/features/home/presentation/components/LevelCard.tsx`, commented import and block in `HomeScreen.tsx:44` and `:224`, `const levelCard = null`, the sticky-index branch that depends on it, `homeCopy.level`, the `onViewLevel` prop | a file plus about 40 lines |
| Buying through the App Store or Google Play | `verifyApple`, `verifyGoogle`, `challenge` in `src/features/payment/data/datasources/remote/subscriptionApi.ts`: typed, never called. Checkout is commented out at `:54` | about 30 lines |
| Removing an attendee | `removeAttendee` in `src/features/post-detail` (API, repository, use case): no screen calls it | 3 small pieces |
| Push notifications (`PUSH_ENABLED = false`) | `app/(app)/_layout.tsx:27`; the device registration code behind it is tested but never runs | by flag |
| Fields that only feed the code above | `ListedPost.lat`, `lng`, `goingCount`, `distanceKm` (`src/features/explore/domain/entities/Explore.ts`) are read only by the switched-off results | 4 fields |
| Exports nothing uses | `PIN_TYPES` (`exploreRules.ts`), `tripDay` (`trips/presentation/format.ts`), `PillSection` (`ProfileHero.tsx`), `setDeviceLocaleForTests` (`shared/money/locale.ts`), `resetCurrencyStateForTests` (`shared/state/preferredCurrency.ts`); used only by tests: `parseWhole` (`postDraftRules.ts`), `clearAppConfigCache` (`appConfig.ts`) | 7 |
| The heart icon | still in the generated icon set, drawn nowhere | 1 |

By scan, 196 exports are used nowhere outside their own file. Most are `…Props` types exported by habit and cost nothing; the list is in the appendix.

---

## 3. Spaghetti

Sizes are code lines without comments or blanks.

### S1. `ExploreScreen`

`src/features/explore/presentation/screens/ExploreScreen.tsx`: 556 lines, one component of about 370, with 14 `useState`, 5 refs and 3 `eslint-disable` lines. It owns the map camera, the pins, the filters, the interest chips, the search hand-over, the list sheet, the mini card, joining, the RSVP notice, reporting, the travel prompt and the status line. `openList` and `showOnMap` had to be placed in a particular order to satisfy the memoisation lint rule.

**Smallest fix:** move the list sheet's state (`listOpen`, `listSession`, `listSearch`) and the card's state (selection, join, notice, report) into two hooks. The screen then lays out the map and its overlays.

### S2. `ExploreListSheet`

866 lines, the longest file in the app. Browse, search suggestions, results and people results are four pages in one file, driven by ten state values in `ListFlow` (`draft`, `words`, `searching`, `scope`, `peopleAsked`, `fieldKey`, `handed`, `carried`, `focusOnOpen`, …). The page shown is worked out from three of them (`!searching`, `words === null`, `scope`).

**Smallest fix:** one `page` value (`browse | suggest | activities | people`) instead of three flags, and a file per page.

### S3. `HomeScreen` and the path a tap takes

560 lines. A post's handlers travel route → `HomeScreen` → `FeedCard` → `FeedPost` → `PostListCard`: twelve props on `FeedPost`. To keep rows from redrawing, the screen holds the route's functions in a ref (`handlers.current`, 4 uses) and wraps each in `useCallback` (11). The route also hands in `linkCard`, a function that wraps each card in a link, and `FeedCard` then has to pass the link's `onPress` back down by hand (`usePressOnce(linked ? (onLinkPress ?? open) : open)`).

### S4. Home borrows its dialogs from Explore

`HomeScreen` imports `RsvpNoticeDialog`, `useRsvpNotice` and `ReportPostFlow` from `@features/explore` (`src/features/explore/index.ts:8-11`). They are not Explore's: they belong in `src/shared`, next to `JoinPill`.

### S5. Large screens and hooks, by scan

| File | Size | What stands out |
|---|---|---|
| `settings/presentation/screens/EditProfileScreen.tsx` | 834 lines | Several sections in one file (`GallerySection` 143, `FavouritesSection` 121) |
| `settings/presentation/hooks/useEditProfile.ts` | one hook of 282 | 12 `useState`, 9 `useCallback` |
| `post-detail/presentation/screens/PostDetailScreen.tsx` | 736 lines | |
| `post-detail/presentation/hooks/useComments.ts` | one hook of 167 | |
| `chat/presentation/screens/ChatScreen.tsx` | one component of 244 | 6 `useState`, 5 refs |
| `chat/presentation/hooks/useConversation.ts` | one hook of 209 | 4 effects, 5 refs |
| `home/presentation/screens/TravelScreen.tsx` | one component of 250 | |
| `shared/components/form/TextField.tsx` | 27 props | Variants for search, glass, filled, prefix, trailing action, clearable in one component |

In all: 20 functions over 150 code lines, 37 over 100.

### S6. A route file that holds logic

`app/(app)/(tabs)/_layout.tsx` is 277 lines: a custom navigator, which pages to keep drawn, three timers and the tab bar wiring. `docs/ARCHITECTURE.md` says route files only wire navigation. It belongs in `src/shared/components/navigation` beside `SwipePager`.

---

## 4. Over-engineering

### O1. Use cases that only pass the call along

Of 153 use-case factories, 75 are a single line that forwards to a repository method with the same arguments (settings 21 of 34, post-detail 11 of 15, home 9 of 10, profile 10 of 20, explore 8 of 16). The hook could call the repository. The layer earns its place only where it holds a rule.

### O2. An interface for every single implementation

Each feature has a repository interface with one implementation and an API type nothing imports (`ExploreApi`, `ChatApi`, `ProfileApi`, `SettingsApi`, `PostApi`, `SubscriptionApi`, and the `…UseCases` types). DTO, entity and mapper often mirror each other field for field: `profileDtos.ts:24` and `Profile.ts:17` share 36 lines, `settingsDtos.ts:86` and `Settings.ts:128` ten, `postDtos.ts:13` and `PostDraft.ts:139` ten.

### O3. The page swipe

Swiping between four tabs took a custom navigator, `SwipePager` (332 lines), `pageSwipe.ts` (193) with a `PagerStep` class and an epoch counter to keep the UI thread and React in step, `PageSwipeZones`, freeze-and-thaw logic with a one-second quiet timer, and a 222-line test file: about 1,100 lines to own. A stock pager (`react-native-pager-view`, or React Navigation's top tabs) gives the gesture for free. What the custom one buys is the measured motion from the recording and the rounded cards with a gap. Worth deciding whether that is worth owning.

### O4. Kept "in case"

Four features are parked behind constants or comments rather than removed (D7). Git keeps them. Each one left in the file is a second version of the screen that must still compile.

### O5. Widths worked out by counting letters

`PostListCard` (`lettersWide`, 0.6 em a letter) and `MiniPostCard` (`buttonNeeds`) each estimate how wide text will be in order to decide a layout. Two copies of one guess; a measured width or a plain wrap would need neither.

---

## 5. Too complicated for what it does

| What | Where | Why it is hard | Is the reason written down? |
|---|---|---|---|
| The when, where and Join line | `src/shared/components/post/PostListCard.tsx` | Estimated widths, a measured row, `flexShrink: 0` to dodge a Yoga shortcut, and a `key` that remounts the row when its basis changes | Yes, in comments. Still fragile: three interacting tricks for one row |
| Keeping the pager and the tabs in step | `SwipePager.tsx`, `pageSwipe.ts`, `app/(app)/(tabs)/_layout.tsx` | Two threads report the same change; `expected` and `epoch` decide whose news it is | Yes |
| The tab bar's shrink | `src/shared/components/navigation/FloatingTabBar.tsx` (478 lines, 7 state, 5 effects) | Nested clips and native-driver values to avoid layout on each frame | Yes (`docs/design/tab-bar-motion.md`) |
| The map's search field | `MapSearchBar.tsx` | Three designs in three days, two of them still inside it | Partly |
| Emptying a text field | `TextField` callers (`fieldKey`, `setFieldKey((k) => k + 1)`) | Inputs are uncontrolled, so clearing one means remounting it | Yes |
| Back swipe from the edge only | `app/(app)/post/[id].tsx` | Re-applies its bounds a frame later because the library reads them too early | Yes |
| Theme change | `src/shared/components/motion/ThemeCrossfade.tsx` | Four timers to cover a native trait change | Yes |
| Post draft rules | `src/features/create-post/domain/rules/postDraftRules.ts` (545 lines) | By scan only: one file for every rule of four post types | Not checked |

Most of these are honest workarounds for platform behaviour, and they are documented. The cost is that each is a place only its author can change safely.

---

## What is in good shape

- No `@ts-ignore` or `@ts-expect-error` anywhere. 11 loose types (`any`, `as unknown as`) in 9 files. 12 `eslint-disable` lines in 10 files.
- Two `TODO`s in the whole app, both real and tracked.
- 11 `console.*` calls, all in `src/core` and two shared hooks, none in screens.
- Literal copy-paste is low: 667 repeated lines across 48 file pairs. The redundancy above is structural (the same idea written again), not pasted.
- Features do not import each other's internals; `scripts/check-boundaries.js` passes.
- Type check and lint are clean, and all 752 tests pass, at this commit.

## Suggested order

1. R1: one Join.
2. R2: one "post by id" query for the map's card and the post's page; chase B11.
3. D7: delete the switched-off code (about 600 lines, no behaviour changes).
4. R6: a render test per card and per list screen, starting with old-shaped data.
5. D2 and D1: one home for the profile rules and the shared DTOs.
6. S1, S2: split Explore's screen and sheet.
7. R5 and D4: decide which post cards survive.

## Appendix: numbers and how to repeat them

| Measure | Value |
|---|---|
| Files / lines / code lines | 760 / 66,993 / 48,380 |
| `useState` / `useEffect` / `useRef` | 317 / 132 / 91 |
| Functions over 150 / 100 / 60 code lines | 20 / 37 / 86 of 1,393 |
| Use-case factories / plain forwards | 153 / 75 |
| Exports unused outside their own file | 196 in 137 files |
| Repeated lines (8-line windows, comments dropped) | 667 across 48 file pairs |
| Test files / tests / render tests | 77 / 752 / 0 |

The scans were small Python scripts over the source tree (regular expressions, no type information), so "unused" and "duplicate" lists are candidates: each one named in this document was checked by hand, the long tail was not. A proper tool would firm them up: `npx knip` for unused files and exports, `npx jscpd src` for copy-paste, `npx madge --circular src` for import cycles. They were not run today because the Mac was short of memory.

Longest files: `ExploreListSheet.tsx` 866, `EditProfileScreen.tsx` 834, `PostDetailScreen.tsx` 736, `HomeScreen.tsx` 560, `ExploreScreen.tsx` 556, `postDraftRules.ts` 545, `PhotoViewer.tsx` 489, `FloatingTabBar.tsx` 478, `PostCard.tsx` 466, `MapSearchBar.tsx` 459, `Comments.tsx` 454.
