# Feature: Chat & DM

**FRD coverage:** MOB-120 → MOB-127
**Owner:** _unassigned_ — put your name here when you pick this feature up.

1:1 threads, group threads (≤50, auto-created from attendee lists), post tagging with rich preview, typing indicators, read receipts, block & report, image attachments.

## Boundary rules

- Everything in this folder is private **except** what `index.ts` exports. Other features import
  `@features/chat` and nothing deeper.
- `presentation/` may import `domain/`. `data/` may import `domain/`. **`domain/` imports nothing**
  from either side, and no React/Expo/network packages at all.
- A screen talks to a hook (the view model). A hook calls use cases. Only a repository implementation
  touches the network, the cache or the device.
- Anything two features both need gets promoted to `src/shared/` in its own PR — never imported
  sideways from another feature folder.

## Expected files

```
chat/
├── data/
│   ├── datasources/remote/     REST + WebSocket subscriptions
│   ├── datasources/local/      cache + draft/offline persistence
│   ├── dto/                    wire shapes, generated from contracts/openapi
│   ├── mappers/                DTO ↔ entity
│   └── repositories/           implementations of the domain contracts
├── domain/
│   ├── entities/               ChatThread, ChatMessage, MessageAttachment, TypingSignal, ReadReceipt
│   ├── repositories/           contracts (interfaces) the data layer implements
│   └── usecases/               ObserveThreadsUseCase, ObserveMessagesUseCase, SendMessageUseCase, …
└── presentation/
    ├── screens/                ThreadListScreen, ChatThreadScreen, PostTagPickerSheet, …
    ├── components/             dumb UI, props in / callbacks out
    ├── hooks/                  view models: own state, call use cases, emit events
    ├── state/                  one state type per screen + one-shot event channel
    └── navigation/             this feature's route list and params
```

## Notes

The only feature with a live socket. Subscriptions live in `data/datasources/remote` over `core/api/websocket` — a screen or hook never touches the socket itself.
