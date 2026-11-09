# Feature: Chat & DM

**FRD coverage:** MOB-120 → MOB-127
**Owner:** _unassigned_ — put your name here when you pick this feature up.

Messages (Figma, light and dark): the conversation list and one conversation, either with one person
or with a group.

- **Messages** (`app/(app)/messages.tsx`). Back and the title. Below them:
  - search ("Search messages", filtered as you type, 250ms after the last key, up to 60 characters);
  - All / Unread / Groups;
  - the conversations, each with a photo, name and last line. The photo is the other person's, or
    for a group its post's cover (`imageUrl`, 200 px), falling back to initials when there is none.
    The line is "You: …" for your own message, "Chioma: …" in a group (the API's `senderName`), or
    "Photo" / "3 photos" for pictures alone. Each also shows a time ("10:42", "Yesterday", "Mon",
    "17 Oct") and a teal unread count ("99+" at the API's cap).

  Pull to refresh; more conversations load as you scroll. The empty states are:
  - "No messages yet", with Explore plans;
  - "No conversations found", with Clear search;
  - nothing unread;
  - no groups.

  The frames' **compose** icon is not drawn: there is no design for picking who to write to, and
  a home-made people picker would be a second people search beside the Search feature's
  (`GET /search/people`) once that lands. Chats start from a profile's **Message** button or an
  activity's **Group chat** button, both through `chatRoutes.start`.

- **Group chats are automatic.** The API makes one when a post goes live and puts everyone going in
  it, up to 100. Nobody "starts" one, and the app has no button for that. Past 100, people going
  wait in line for the next place; no push says when they get in, the chat just appears in their
  list.

- **Opening a chat** (`app/(app)/chat/start.tsx`, `StartChatScreen`). Other features push
  `{ pathname: chatRoutes.start, params: { userId } }` or `{ postId }`. It calls
  `POST /conversations` (for a person: existing or new; for a post: only finds the group chat you
  are in), puts the answer in the cache and `router.replace`s itself with the thread, so Back returns
  to the profile or post. A loading ring meanwhile; refusals are said in place with Try again (where
  it could help) and Go back:
  - 403 (person): "They only take messages from people they share a post with" (`dmPermission: shared_only`);
  - 409 (person): yourself;
  - 409 `GROUP_CHAT_FULL` (post): said calmly, like an empty state with an hourglass and only Go back:
    "The group chat is full right now. You'll be added when a place opens.";
  - 404 (post): "This chat isn't available" (you left or were removed, or the post was cancelled);
    any copy of that post's chat is dropped from the lists;
  - 429 `CHAT_START_LIMIT`: "You've started a lot of new chats today; try again tomorrow".

- **A conversation** (`app/(app)/chat/[id].tsx`).
  - Header: back, a photo and the name. Under the name is "Online" for a person or
    "8 members · 3 online" for a group, or "typing…" / "Chioma is typing…" for 5 seconds after a
    typing signal; then the safety-tips shield.
  - The "Keep chats on Ajala" banner (closing it is remembered on the phone).
  - Then "Today", the activity card (the thread's own `post`; none when it is null; it opens the
    post), and the messages. In a group, the sender's name sits above the first message of each run.
  - Your messages are teal and show "Sent" or "Read", worked out from the other members'
    `lastReadMessageId` (one to one: they have read it; group: everyone who shows receipts has).
  - Pictures sit above the words; a tagged activity shows as the same card, or "This activity is no
    longer available"; a moderated message reads "This message was removed".
  - Older messages load when you scroll to the top. While the chat is in focus, the newest message
    is marked read. Long-press someone else's message to report it.
  - The composer has a photo button (up to 4, resized and re-encoded by `@core/media/imagePicker`
    like every other upload). What you send shows straight away, dimmed. If sending fails, the
    message is taken back, the words and photos stay, and a notice appears for a few seconds;
    sending the same thing again reuses its `clientMsgId`.
  - **Gone.** A 404 from the thread, its messages, a send or a read mark means the chat is no longer
    there for you: you left or were removed, or its post was cancelled or deleted (which removes the
    chat for everyone). It is dropped from every cached list at once, the composer goes, and a short
    sheet ("This chat isn't available", Go back) leaves the screen.
- **Safety tips**: a sheet with the five tips and "Got it".
- **The Messages badge.** `useUnreadChatsCount()` (public) reads `GET /conversations/unread-count`,
  which counts conversations with anything unread, not messages. The Home route passes it to
  `HomeScreen`, which draws the bell's coral badge on the chat button ("Messages, 2 unread"). It is
  asked again when Home comes back into view, and refetched when a thread is marked read, a message
  arrives on the socket, a chat push arrives, or a chat is dropped.

## API (spec §2.18, §3.9; types §6; screen map §10a; backend answers Nov 9 2026, B2–B6)

Wire shapes are in `data/dto/chatDtos.ts`, copied from the spec plus the backend's Nov 9 additions
(`docs/api/backend-answers-2026-11-09.md`), which win until the spec is re-synced. Errors are read per call in
`toChatError` (`data/mappers/chatMappers.ts`): the same 403 is `dmRestricted` when starting and
`notAllowed` ("can no longer be messaged") when sending.

| Screen         | Call                                                                 | Notes                                                                             |
| -------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Messages       | `GET /conversations?tab=all\|unread\|groups&search=&cursor&limit`     | Latest activity first. `search` ≤ 60. `imageUrl`, `lastMessage.senderName`         |
| Badge          | `GET /conversations/unread-count`                                    | `{ count }`: conversations with anything unread                                    |
| Open a chat    | `POST /conversations { userId } \| { postId }`                        | → `ConversationDetailDto`. A post's chat is only found. 400 / 403 / 404 / 409 (`GROUP_CHAT_FULL`) / 429 |
| A conversation | `GET /conversations/{id}`                                            | Members (host first) with `online` and `lastReadMessageId`; `onlineCount`; `post` (a card, or null) |
| A conversation | `GET /conversations/{id}/messages?before=&limit=30`                  | Newest first; `nextCursor` is the next `before`                                    |
| Send           | `POST /conversations/{id}/messages` (multipart)                      | `clientMsgId` (uuid, reused on retry), `body` ≤ 2000, `taggedPostId?`, `images` ≤ 4 |
| Read           | `POST /conversations/{id}/read { messageId }`                        | The newest confirmed message, while in focus. Never moves back                     |
| Typing         | `POST /conversations/{id}/typing`                                    | At most every 3 s; shown for 5 s                                                   |
| Members        | `POST /conversations/{id}/members { userId }`, `DELETE …/members/{userId}` | Use cases only, no UI yet (no design)                                       |
| Report         | `POST /conversations/{id}/messages/{messageId}/report`               | `{ reason, details? }`; 403 `REPORTING_PAUSED`, 409 already reported               |

No `GET /posts/{id}`: "You: …" is a null `senderName`, and the activity card is the thread's
`post`. Your own id comes from auth (`useMyUserId`, which asks `GET /me` once when the session
doesn't carry it), falling back to your own messages (`mine`) until it is known. It hides your own
typing signal, and places socket messages (below).

A 404 on any conversation route means it is gone for you (left, removed, or the post was cancelled
or deleted); see "Gone" above.

**Message ids** are 64-bit numbers sent as strings. They are never turned into JS numbers;
`compareMessageIds` orders them by length, then character by character.

**Picture links last an hour**, so messages are not cached on disk and images are kept in memory
only; the thread is fetched again whenever it comes back into focus.

### Live updates

One socket.io connection to the socket host's `/chat` namespace (`src/core/api/websocket/chatSocket.ts`;
spec §2.20), held while any chat screen is mounted (`useChatRealtime`) and closed when the last lets
go.

- **Host.** `EXPO_PUBLIC_WS_URL` (staging: `https://staging-ws.ajalatrvl.com`; dev:
  `https://dev-ws.ajalatrvl.com`), not the API host. Unset, it is guessed from the API URL by
  swapping the "api" host label for "ws" (`staging-api` → `staging-ws`, `api` → `ws`; `socketUrl.ts`).
- **Token** in the handshake's `auth.token` only, asked of auth on every handshake. On
  `session.expiring` the socket hands its token back to auth (`useFreshAccessToken(refused)`),
  which refreshes past it, and reconnects; `server.restart` reconnects after `reconnectInMs`. The
  server cutting the socket (`io server disconnect`) is retried after a growing wait only while
  still signed in. Refusals by `error.data.code`: `UNAUTHENTICATED` refreshes and retries (twice in a
  row at most), `RATE_LIMITED` waits a minute, `SERVICE_UNAVAILABLE` retries after 3 s, then longer;
  `SESSION_SOCKET_LIMIT` and `FORBIDDEN` stop (a dev warning, no loop).
- **Events.** `message.new`, `read.update` and `typing` go into the query cache
  (`presentation/state/chatCache.ts`). `message.new` has no `mine`, and every member hears it, the
  sender too: it is yours when `sender.id` is your id, and a copy already held (the one being sent,
  or the send's answer, matched by `id` or `clientMsgId`) keeps its side, so your message never
  flips across (`isMine`). `rsvp.update { postId }` (spec §8 Q5 asks whether it is still sent)
  marks every query whose key holds that post id stale, plus the threads' activity cards. After a
  reconnect the lists and threads are refetched. It is best effort: screens refetch on focus anyway.

`<ChatRealtime />` is mounted once in `app/(app)/_layout.tsx`, so the socket stays up for the whole
signed-in session and the list updates before Messages is opened.

**Chat pushes** heard while the app is open (`{ kind: 'chat.message', conversationId }`, from
`@core/push`'s `onPushReceived`) come through the same live source as a `pushed` event: the lists,
the badge and that conversation's messages are refetched. That is what keeps them current when the
socket is down. Tapping a chat push opens the conversation; that routing is the
notifications feature's (`pushOpenOf`), which leaves the inbox alone for chat pushes.

## Open questions (flag to backend)

- **Socket hosts** for staging and production (spec §8 Q6); until named, set `EXPO_PUBLIC_WS_URL`.
- **`rsvp.update`**: still sent on `/chat`? (spec §8 Q5). Handled if it is.
- **Group "Read"**: confirm whether it should mean everyone or anyone has read it.
- **Socket on removal**: is there an event when a chat is removed or you are taken out of it? Today
  the app only learns from the next 404.

## Gaps and decisions

- **Not built (no design)**: adding or removing group members, leaving a group, tagging a post from
  the composer, viewing a picture full size.
- **Safety banner**: closing it is stored on this phone only (AsyncStorage
  `ajala.chat.safetyBannerDismissed`). It is not synced to the account.

## Boundary rules

- Everything in this folder is private **except** what `index.ts` exports (`MessagesScreen`,
  `ChatScreen`, `StartChatScreen`, `ChatRealtime`, `useUnreadChatsCount`, `chatRoutes`). Other features import `@features/chat` and nothing deeper.
- `presentation/` may import `domain/`. `data/` may import `domain/`. **`domain/` imports nothing**
  from either side, and no React, Expo or network packages at all.
- A screen talks to a hook. A hook calls use cases through TanStack Query (`presentation/state/chatQueries.ts`
  holds the keys). Only a repository implementation touches the network or the device.

## Files

```
chat/
├── chatModule.ts               composition root: createChatUseCases(request)
├── data/
│   ├── datasources/remote/     chatApi.ts — the chat endpoints
│   ├── datasources/realtime/   chatLive.ts — socket events and chat pushes as domain events
│   ├── datasources/local/      safetyBannerStore.ts
│   ├── dto/                    chatDtos.ts (spec §6)
│   ├── mappers/                chatMappers.ts — DTO → entity, socket payload / push → event, API error → ChatError
│   └── repositories/           ChatRepositoryImpl.ts
├── domain/
│   ├── entities/               Chat.ts, ChatError.ts
│   ├── repositories/           ChatRepository, ChatLive, PhotoPicker, SafetyBannerStore
│   ├── rules/                  chatRules.ts — ids, previews, Sent/Read, presence, day dividers
│   └── usecases/               ChatUseCases.ts
└── presentation/
    ├── screens/                MessagesScreen, ChatScreen, StartChatScreen
    ├── components/             ThreadRow, ThreadsSkeleton, ChatHeader, MessageBubble, PostContextCard,
    │                           SafetyBanner, SafetyTipsSheet, Composer, ReportMessageDialog, EmptyArt
    ├── hooks/                  useThreads, useConversation, useStartChat, useChatRealtime,
    │                           useUnreadChatsCount, useSafetyBanner
    ├── state/                  chatQueries (keys), chatCache (live events → cache, dropping gone chats),
    │                           useChatUseCases
    ├── navigation/             routes.ts
    ├── copy.ts                 every string
    └── format.ts               list times, message times, day labels
```
