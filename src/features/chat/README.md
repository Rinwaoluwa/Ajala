# Feature: Chat & DM

**FRD coverage:** MOB-120 → MOB-127
**Owner:** _unassigned_ — put your name here when you pick this feature up.

Messages (Figma, light and dark): the conversation list and one conversation, either with one person
or with a group.

- **Messages** (`app/(app)/messages.tsx`). Back, the title, and a compose button. Below them:
  - search ("Search messages", filtered as you type, 250ms after the last key);
  - All / Unread / Groups;
  - the conversations, each with a photo, name and last line. The line is "You: …" for your own
    message, or "Chioma: …" in a group. Each also shows a time ("10:42", "Yesterday", "Mon",
    "17 Oct") and a teal unread count.

  Pull to refresh; more conversations load as you scroll. The empty states are:
  - "No messages yet", with Explore plans;
  - "No conversations found", with Clear search;
  - nothing unread;
  - no groups.

- **A conversation** (`app/(app)/chat/[id].tsx`).
  - Header: back, a photo and the name. Under the name is "Online" for a person or
    "8 members · 3 online" for a group, followed by the safety-tips shield.
  - The "Keep chats on Ajala" banner (closing it is remembered on the phone).
  - Then "Today", the activity card the chat is about (it opens the post), and the messages. In a
    group, the sender's name sits above the first message of each run.
  - Your messages are teal and show "Sent" or "Read". Older messages load when you scroll to the
    top. Opening a chat marks it read.
  - The composer shows what you send straight away. If sending fails, the message is taken back and
    a notice appears for a few seconds.
- **Safety tips**: a sheet with the five tips and "Got it".

## API — PROPOSED (not in docs/api yet)

Chat is not in the User & Common spec or the Screen-to-API map. These endpoints are **proposed** for
the backend team. The wire shapes are in `data/dto/chatDtos.ts`. Paging uses the usual
`{ items, nextCursor }`.

| Screen         | Call                                                           | Notes                                                                                                                     |
| -------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Messages       | `GET /api/v1/chats?filter=all\|unread\|groups&q=&cursor&limit` | Latest message first. `q` matches the name or the last message.                                                           |
| A conversation | `GET /api/v1/chats/:id`                                        | Title, photo, kind, members and online counts, the other person's online state, unread count, the activity card (`post`). |
| A conversation | `GET /api/v1/chats/:id/messages?cursor&limit`                  | **Newest page first.** The app turns it round to draw oldest at the top.                                                  |
| Send           | `POST /api/v1/chats/:id/messages { text }`                     | Text is trimmed, 1–2000 characters. Returns the message.                                                                  |
| Read           | `POST /api/v1/chats/:id/read`                                  | Sent on opening a chat with unread messages.                                                                              |

Until the API has these, it answers **404 or 405**. `toChatError` reads that as `unavailable`, so the
app can still ship:

- the list shows "No messages yet";
- a conversation says chat is coming soon;
- sending shows the same notice.

Other codes map to `invalid`, `notAllowed`, `rateLimited`, `network` and `sessionExpired`
(`chatErrorMessages` in `presentation/copy.ts`).

**Demo mode** (`EXPO_PUBLIC_DEMO=1`) answers all five calls from `src/core/demo/routes/chat.ts`:

- six conversations from the designs;
- activity cards on Maya Chen (`p-lekki-market`) and Lagos Weekend Crew (`p-tarkwa`);
- what you send is kept in memory while the app runs.

## Gaps and decisions (flag to product and backend)

- **The endpoints above are proposals.** The backend needs to confirm the paths, shapes and paging
  order.
- **Starting a conversation**: there is no endpoint for it, and no design for picking someone. The
  compose button opens a short sheet saying it's coming soon. Group chats are expected to be created by
  the server from attendee lists (FRD). The public profile's **Message** button only opens this list:
  it needs a "start or open a chat with this person" endpoint to go straight to a conversation.
- **Not built**:
  - typing indicators and a live socket. The list and the conversation refresh when pulled, when
    reopened after a minute, and when the app comes back to the foreground;
  - read receipts beyond the "Read" status the API sends;
  - attachments, tagging a post from the composer, and block or report from a chat.
- **Safety banner**: closing it is stored on this phone only (AsyncStorage
  `ajala.chat.safetyBannerDismissed`). It is not synced to the account.

## Boundary rules

- Everything in this folder is private **except** what `index.ts` exports (`MessagesScreen`,
  `ChatScreen`, `chatRoutes`). Other features import `@features/chat` and nothing deeper.
- `presentation/` may import `domain/`. `data/` may import `domain/`. **`domain/` imports nothing**
  from either side, and no React, Expo or network packages at all.
- A screen talks to a hook. A hook calls use cases through TanStack Query (`presentation/state/chatQueries.ts`
  holds the keys). Only a repository implementation touches the network or the device.

## Files

```
chat/
├── chatModule.ts               composition root: createChatUseCases(request)
├── data/
│   ├── datasources/remote/     chatApi.ts — the proposed endpoints
│   ├── datasources/local/      safetyBannerStore.ts
│   ├── dto/                    chatDtos.ts (PROPOSED wire shapes)
│   ├── mappers/                chatMappers.ts — DTO → entity, API error → ChatError
│   └── repositories/           ChatRepositoryImpl.ts
├── domain/
│   ├── entities/               Chat.ts, ChatError.ts
│   ├── repositories/           ChatRepository, SafetyBannerStore
│   ├── rules/                  chatRules.ts — preview line, presence, day dividers, sender names
│   └── usecases/               ChatUseCases.ts
└── presentation/
    ├── screens/                MessagesScreen, ChatScreen
    ├── components/             ThreadRow, ThreadsSkeleton, ChatHeader, MessageBubble, PostContextCard,
    │                           SafetyBanner, SafetyTipsSheet, Composer
    ├── hooks/                  useThreads, useConversation, useSafetyBanner
    ├── state/                  chatQueries (keys), useChatUseCases
    ├── navigation/             routes.ts
    ├── copy.ts                 every string
    └── format.ts               list times, message times, day labels
```
