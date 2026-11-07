# Feature: Chat & DM

**FRD coverage:** MOB-120 → MOB-127
**Owner:** _unassigned_ — put your name here when you pick this feature up.

Messages (Figma, light and dark): the conversation list and one conversation, either with one person
or with a group.

- **Messages** (`app/(app)/messages.tsx`). Back and the title. Below them:
  - search ("Search messages", filtered as you type, 250ms after the last key, up to 60 characters);
  - All / Unread / Groups;
  - the conversations, each with a photo, name and last line. The line is "You: …" for your own
    message, "Chioma: …" in a group (when the members are known, see below), or "Photo" / "3 photos"
    for pictures alone. Each also shows a time ("10:42", "Yesterday", "Mon", "17 Oct") and a teal
    unread count ("99+" at the API's cap).

  Pull to refresh; more conversations load as you scroll. The empty states are:
  - "No messages yet", with Explore plans;
  - "No conversations found", with Clear search;
  - nothing unread;
  - no groups.

  The frames' **compose** icon is not drawn: there is no design for picking who to write to, and
  a home-made people picker would be a second people search beside the Search feature's
  (`GET /search/people`) once that lands. Chats start from a profile's **Message** button or an
  activity's group chat, both through `chatRoutes.start`.

- **Opening a chat** (`app/(app)/chat/start.tsx`, `StartChatScreen`). Other features push
  `{ pathname: chatRoutes.start, params: { userId } }` or `{ postId }`. It calls
  `POST /conversations` (existing or new), puts the answer in the cache and `router.replace`s itself
  with the thread, so Back returns to the profile or post. A loading ring meanwhile; refusals are said
  in place with Try again (where it could help) and Go back:
  - 403 (person): "They only take messages from people they share a post with" (`dmPermission: shared_only`);
  - 403 (post): only the host can start the group chat;
  - 409: yourself, or a post that isn't live or has more than 50 going;
  - 429 `CHAT_START_LIMIT`: "You've started a lot of new chats today; try again tomorrow".

- **A conversation** (`app/(app)/chat/[id].tsx`).
  - Header: back, a photo and the name. Under the name is "Online" for a person or
    "8 members · 3 online" for a group, or "typing…" / "Chioma is typing…" for 5 seconds after a
    typing signal; then the safety-tips shield.
  - The "Keep chats on Ajala" banner (closing it is remembered on the phone).
  - Then "Today", the activity card (`postId`, read with `GET /posts/{id}`; it opens the post), and
    the messages. In a group, the sender's name sits above the first message of each run.
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
- **Safety tips**: a sheet with the five tips and "Got it".

## API (spec §2.18, §3.9; types §6; screen map §10a)

Wire shapes are in `data/dto/chatDtos.ts`, copied from the spec. Errors are read per call in
`toChatError` (`data/mappers/chatMappers.ts`): the same 403 is `dmRestricted` when starting and
`notAllowed` ("can no longer be messaged") when sending.

| Screen         | Call                                                                 | Notes                                                                             |
| -------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Messages       | `GET /conversations?tab=all\|unread\|groups&search=&cursor&limit`     | Latest activity first. `search` ≤ 60                                               |
| Open a chat    | `POST /conversations { userId } \| { postId }`                        | → `ConversationDetailDto`, existing or new. 400 / 403 / 404 / 409 / 429            |
| A conversation | `GET /conversations/{id}`                                            | Members (host first) with `online` and `lastReadMessageId`; `onlineCount`          |
| A conversation | `GET /conversations/{id}/messages?before=&limit=30`                  | Newest first; `nextCursor` is the next `before`                                    |
| Send           | `POST /conversations/{id}/messages` (multipart)                      | `clientMsgId` (uuid, reused on retry), `body` ≤ 2000, `taggedPostId?`, `images` ≤ 4 |
| Read           | `POST /conversations/{id}/read { messageId }`                        | The newest confirmed message, while in focus. Never moves back                     |
| Typing         | `POST /conversations/{id}/typing`                                    | At most every 3 s; shown for 5 s                                                   |
| Members        | `POST /conversations/{id}/members { userId }`, `DELETE …/members/{userId}` | Use cases only, no UI yet (no design)                                       |
| Report         | `POST /conversations/{id}/messages/{messageId}/report`               | `{ reason, details? }`; 403 `REPORTING_PAUSED`, 409 already reported               |
| (list preview) | `GET /me`                                                            | Only the id, to tell "You: …" apart in a group's last line                         |
| (activity card)| `GET /posts/{id}`                                                    | Title, time and place; 404 means no card                                           |

**Message ids** are 64-bit numbers sent as strings. They are never turned into JS numbers;
`compareMessageIds` orders them by length, then character by character.

**Picture links last an hour**, so messages are not cached on disk and images are kept in memory
only; the thread is fetched again whenever it comes back into focus.

### Live updates

One socket.io connection to the `/chat` namespace (`src/core/api/websocket/chatSocket.ts`), held
while any chat screen is mounted (`useChatRealtime`) and closed when the last lets go. `message.new`,
`read.update` and `typing` go into the query cache (`presentation/state/chatCache.ts`); after a
reconnect the lists and threads are refetched. It is best effort: screens refetch on focus anyway.
**Demo mode has no socket.**

`<ChatRealtime />` is mounted once in `app/(app)/_layout.tsx`, so the socket stays up for the whole
signed-in session and the list updates before Messages is opened. The socket asks auth for a token
on every (re)connect (`useFreshAccessToken`), which refreshes it first when it is about to expire.

**Demo mode** (`EXPO_PUBLIC_DEMO=1`) answers every call above from `src/core/demo/routes/chat.ts`:

- six conversations from the designs, with 19-digit message ids, a removed message, pictures, a
  tagged post and one that is no longer available;
- start a chat with any demo person; James K. (`h-james`) answers 403; the eleventh new chat in a
  run answers 429 `CHAT_START_LIMIT`; your own post (`p-my-rooftop`) can get a group chat, others 403;
- sends are idempotent on `clientMsgId`; read marks, typing, members and reports all answer.

## Open questions (flag to backend)

- **No sender name in list previews.** `LastMessageDto` has `senderId` only, so a group's "Chioma: …"
  needs that conversation's members already cached. A `senderName` (or first name) would fix it.
- **No group photo.** `ConversationDto` has no avatar for a group; groups show their initials. The
  post's first image could stand in if the backend agrees.
- **No total unread count** for a badge on the chat icon (the inbox has `unreadCount`; chat doesn't).
- **The `new_message` notification payload**: `data.kind` is `message` with a `postId` in the demo;
  it needs the `conversationId` so tapping it can open the chat.
- **Socket handshake**: does `/chat` read `auth.token` or the `Authorization` header? Both are sent.
- **Group "Read"**: confirm whether it should mean everyone or anyone has read it.

## Gaps and decisions

- **Not built (no design)**: adding or removing group members, leaving a group, tagging a post from
  the composer, viewing a picture full size.
- **Safety banner**: closing it is stored on this phone only (AsyncStorage
  `ajala.chat.safetyBannerDismissed`). It is not synced to the account.

## Boundary rules

- Everything in this folder is private **except** what `index.ts` exports (`MessagesScreen`,
  `ChatScreen`, `StartChatScreen`, `ChatRealtime`, `chatRoutes`). Other features import `@features/chat` and nothing deeper.
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
│   ├── datasources/realtime/   chatLive.ts — socket events as domain events
│   ├── datasources/local/      safetyBannerStore.ts
│   ├── dto/                    chatDtos.ts (spec §6)
│   ├── mappers/                chatMappers.ts — DTO → entity, socket payload → event, API error → ChatError
│   └── repositories/           ChatRepositoryImpl.ts
├── domain/
│   ├── entities/               Chat.ts, ChatError.ts
│   ├── repositories/           ChatRepository, ChatLive, PhotoPicker, SafetyBannerStore
│   ├── rules/                  chatRules.ts — ids, previews, Sent/Read, presence, day dividers
│   └── usecases/               ChatUseCases.ts
└── presentation/
    ├── screens/                MessagesScreen, ChatScreen, StartChatScreen
    ├── components/             ThreadRow, ThreadsSkeleton, ChatHeader, MessageBubble, PostContextCard,
    │                           SafetyBanner, SafetyTipsSheet, Composer, ReportMessageDialog
    ├── hooks/                  useThreads, useConversation, useStartChat, useChatRealtime, useMyId,
    │                           useSafetyBanner
    ├── state/                  chatQueries (keys), chatCache (socket → cache), useChatUseCases
    ├── navigation/             routes.ts
    ├── copy.ts                 every string
    └── format.ts               list times, message times, day labels
```
