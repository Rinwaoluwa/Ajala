# Feature: Post Detail

**FRD coverage:** MOB-100 → MOB-108
**Owner:** _unassigned_ — put your name here when you pick this feature up.

Full gallery, full description with map snippet, attendee strip, host card, threaded comments, share deep link, report, Plan checklist, Event coupon entry.

## What is built

The post page (Figma post detail, light and dark): photos with a glass back button and type tag,
title, host ("Hosted by …", opens their profile), description, Date & Time, Location (opens Maps),
Price and Joined tiles, the main button and Share, safety tips, Who's Going, and Comments.

| Element                                                     | API                                                                            |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------ |
| The page                                                    | `GET /posts/:id` with `X-Client-Location`                                      |
| Join / Request to join / waiting list                       | `POST /posts/:id/rsvp` — optimistic, rolled back on a refusal                  |
| ✓ You're Going / Requested / Waitlisted → leave or withdraw | `DELETE /posts/:id/rsvp` (asks first)                                          |
| Book a spot (paid Event, `joinMode: external`)              | open `externalUrl`, `POST /posts/:id/link-click`                               |
| Who's Going                                                 | `GET /posts/:id/attendees?state=going` (paged); the host also sees `requested` |
| Accept / Decline (host)                                     | `POST /posts/:id/attendees/:userId/accept                                      | decline` |
| ⋯ → Cancel / Delete (host)                                  | `POST /posts/:id/cancel`, `DELETE /posts/:id` (409 → offer Cancel)             |
| ⋯ → Report activity                                         | explore's report flow (`ReportPostFlow`), `POST /posts/:id/report`             |
| Share                                                       | the post link, `https://ajalatrvl.com/posts/<id>` (`LINKS_HOST` in the rules)  |

## Gaps (API map §12)

- **Comments** have no endpoint: the section is its empty state, and the bar at the foot keeps what
  was typed and says comments are coming.
- **Message**, **Follow** and **mutual friends** are not in the API, so they are left out.
- The design labels every type's button "Join event"; it says the type here ("Join plan").

## Boundary rules

- Everything in this folder is private **except** what `index.ts` exports. Other features import
  `@features/post-detail` and nothing deeper.
- `presentation/` may import `domain/`. `data/` may import `domain/`. **`domain/` imports nothing**
  from either side, and no React/Expo/network packages at all.
- A screen talks to a hook (the view model). A hook calls use cases. Only a repository implementation
  touches the network, the cache or the device.
- Anything two features both need gets promoted to `src/shared/` in its own PR — never imported
  sideways from another feature folder.

## Layout

```
post-detail/
├── postDetailModule.ts        composition root
├── data/                      postDetailApi, DTOs, mappers, PostDetailRepositoryImpl
├── domain/                    PostDetail, PostDetailError, postDetailRules (button state, optimistic RSVP)
└── presentation/
    ├── screens/               PostDetailScreen
    ├── components/            PostHero, InfoRow/StatTile, JoinBar, WhoIsGoing, Comments, PostSkeleton
    ├── hooks/                 usePostDetail (view model)
    └── state/                 query keys, use-case hook
```

## Comments (proposed endpoint)

The API has no comments yet (API map §12). The page calls a **proposed** endpoint, for the
backend to confirm:

| Call                                          | Body / answer                                              |
| --------------------------------------------- | ---------------------------------------------------------- |
| `GET /api/v1/posts/:id/comments?cursor&limit` | `{ items: CommentDto[], nextCursor, total }`, oldest first |
| `POST /api/v1/posts/:id/comments`             | `{ text (1–500), replyToId? }` → `CommentDto`              |

`CommentDto` is `{ id, user: { id, displayName, avatarUrl }, text, createdAt, replyTo: { id, displayName } | null }`.

Until it exists the real API answers 404, which the page reads as "not available yet": the
section shows its empty state and a send keeps the text and says comments are coming. Demo mode
answers it (with seeded conversations on a few posts) so the design can be tried end to end.
