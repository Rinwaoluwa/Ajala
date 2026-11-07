# Feature: Notifications

**FRD coverage:** MOB-180 → MOB-186
**Owner:** _unassigned_ — put your name here when you pick this feature up.

The notifications inbox opened from the home bell (Figma Notifications): a centred title with a
round back button, All / Unread, and one row per notification — a tinted icon square for its
category, title, line, and a short time ("2m", "1h", "1d"). Unread rows have a bolder title and
a small dot.

## API (spec §2.17, §3.5; API map §11)

- `GET /me/notifications?unread=false|true&cursor&limit` → `InboxPageDto { items, nextCursor,
  unreadCount }`. All and Unread are filtered by the server, each its own cached infinite query
  (`['notifications', unread]`). Newest first, the last 90 days.
- `POST /me/notifications/read { ids? }` → 204. Tapping a row sends `{ ids: [id] }`; the header's
  round "mark all as read" button (shown only while anything is unread) sends `{}`. Both update
  the cached lists and the badge at once, put them back on failure, and refetch afterwards.
  Opening the screen marks nothing read.

`category` picks the icon (`NotificationRow`). The DTO has no sender photo, so a message shows
the chat icon. A category this build doesn't know shows as a post update.

Tapping routes on the notification (`targetOf`): `new_message` → its conversation when
`data.conversationId` is sent, otherwise Messages; `subscription` → the Travel paywall; anything
with a `postId` → the post page; the rest (a report reviewed) stays on the list. The route file
(`app/(app)/notifications.tsx`) maps those to the chat, payment and post-detail routes.

Push payloads carry the same `data` (spec §2.10), so a tapped push goes through `targetOf` too
(see Push below).

## The badge

`useUnreadNotificationsCount()` (public) reads `unreadCount` from the first page of the All
list — the same cache the screen marks — and refetches whenever its screen comes back into view.
The Home route passes it to `HomeScreen`, which draws a coral count on the bell ("Notifications,
3 unread").

Push *preferences* live in Settings / Notifications (`GET/PATCH /me/settings`).

## Push (spec §2.10, API map §11)

`<PushNotifications>` (public) is mounted once in the signed-in layout (`app/(app)/_layout.tsx`),
inside the location gate, so nothing about push happens before sign-in, the entry check
(terms, profile setup) and location. It draws nothing; the route file says where a tapped push goes,
as it does for the inbox. The platform side (expo-notifications) is `src/core/push`; the API calls
are here.

- **Permission.** Asked once per install, about 1.5 s after the person first reaches the app, and
  never at cold launch before sign-in. A "no" (or an Android 13 prompt dismissed without an answer)
  is respected; someone who later turns notifications on in the phone's settings is registered the
  next time the app comes to the foreground, without being asked. Android gets a `default` channel
  (high importance) before the prompt, which Android 13 needs.
- **Registration.** `POST /me/devices { token, platform, deviceId, timezone }` on every sign-in
  (each mount of the signed-in app), whenever the OS hands out a new token
  (`addPushTokenListener`), and on coming back to the app once permission appears. `deviceId` is
  the sign-in one (`core/device`), `timezone` the IANA zone. `appInstanceId` is not sent: it is
  Firebase's, and the app has no Firebase SDK. The registered token is kept in the secure store.
  Bodies are built by `buildDeviceRegistration` (spec §4 limits).
- **Sign-out.** `POST /me/devices/unregister { token }` runs before `POST /auth/logout`. Auth can't
  import this feature (this feature imports auth), so the task is registered with
  `@core/session/beforeSignOut`, which auth's sign-out runs with a 3 s limit; failures are ignored
  and the token is forgotten either way. A sign-out before the signed-in app mounted in this launch
  (from the terms screen, say) has no task registered and skips it, so the phone may keep getting that account's pushes until
  the API drops or re-assigns the token. Rare enough to leave for now.
- **A push arrives while open.** Shown as a banner (and in the list), and every `['notifications']`
  query is refetched, so the inbox and the bell badge catch up.
- **A push is tapped** (open, background, or launched from closed via
  `getLastNotificationResponseAsync`). `pushOpenOf` reads its `data` as the inbox row it mirrors
  and opens the same place (`targetOf`): the post, the chat (or Messages), or the paywall. `kind`
  spellings are not pinned down yet (backend-requests B6): the demo's `message`, `comment`,
  `post_updated`, `report_resolved` are read as their categories, and a `conversationId` marks a
  message. When the push carries `notificationId` (not in the spec yet; the demo payload has it)
  that inbox item is marked read; otherwise the inbox is just refetched. Each tap is handled once.
- **Where the data sits.** Android data messages land in `content.data`. On iOS,
  expo-notifications only fills `content.data` from a `body` key, so keys sent beside `aps` (the
  normal APNs/FCM shape) are read from the trigger's payload instead (`core/push/pushPayload.ts`).

**Token: APNs or FCM on iOS?** The app sends `getDevicePushTokenAsync()`, the native token: FCM
on Android, **APNs** on iOS. The spec calls the field "FCM token". If the backend sends iOS pushes
through FCM, it needs an FCM token from iOS too, which means adding Firebase Messaging to the iOS
app. Open question: docs/api/backend-requests.md A13.

**Needs, outside the code:** `google-services.json` for `com.ajala.app` (Android, via the
`GOOGLE_SERVICES_JSON` env/EAS file variable, see `app.config.js`); Push Notifications on the
App ID and an APNs key (.p8) given to whoever sends (the backend, or Firebase if A13 lands on
FCM). Local `expo run:ios` builds get sandbox tokens; EAS builds production ones. To try a push
without a backend: docs/DEMO.md, "Trying a push".

```
notifications/
├── notificationsModule.ts       composition root (takes auth's authorized request)
├── data/                        notificationsApi (inbox + devices), DTOs, mappers,
│                                NotificationsRepositoryImpl, PushDevicesRepositoryImpl, pushTokenStore
├── domain/                      AppNotification, PushDevice, NotificationsError, use cases
│                                (inbox, PushUseCases), notificationRules (targetOf, markPagesRead,
│                                shortAgo), pushRules (buildDeviceRegistration, pushOpenOf,
│                                shouldAskForPushPermission)
└── presentation/                NotificationsScreen, NotificationRow, useNotifications,
                                 useInbox (query + mark-read mutation), useUnreadNotificationsCount,
                                 PushNotifications + usePushNotifications
```
