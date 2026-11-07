# Feature: Post Detail

**FRD coverage:** MOB-100 → MOB-108
**Owner:** _unassigned_ — put your name here when you pick this feature up.

Full gallery, full description with map snippet, attendee strip, host card, threaded comments, share deep link, report, an Event's running order and a Plan's itinerary, Event coupon entry.

## What is built

The post page (Figma post detail, light and dark): photos with a glass back button, type tag,
bookmark and ⋯; title; host ("Hosted by …", opens their profile) with **Message**, or the host's
**Group chat**; description and interests; Date & Time (with the end time, and "Repeats weekly"
for a Group), Location (opens Maps), Price (or "About ₦12,000 each" for a shared cost) and Joined
tiles, the main button and Share, the host's link clicks, an Event's running order or a Plan's
itinerary, safety tips, Who's Going, and Comments with their replies.

| Element                                                     | API                                                                             |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------- |
| The page                                                    | `GET /posts/:id` with `X-Client-Location`                                       |
| End time, repeats, running order, itinerary, interests      | `endAt`, `recurrence`, `schedule` (Events), `itinerary` (Plans), `interests`    |
| "About N each"                                              | `costSplit.perPersonCents` with its `exponent` and `currency` (spec §1.5)       |
| "N people opened your booking link" (host)                  | `linkClickCount` (null unless you host)                                         |
| Bookmark                                                    | `POST` / `DELETE /posts/:id/save` via the shared `useSavePost` (live posts)     |
| Message (not the host)                                      | the chat start route with `{ userId }` → `POST /conversations { userId }`       |
| Group chat (host, live post)                                | the chat start route with `{ postId }` → `POST /conversations { postId }`       |
| Join / Request to join / waiting list                       | `POST /posts/:id/rsvp` — optimistic, rolled back on a refusal                   |
| ✓ You're Going / Requested / Waitlisted → leave or withdraw | `DELETE /posts/:id/rsvp` (asks first)                                           |
| Book a spot (paid Event, `joinMode: external`)              | open `externalUrl`, `POST /posts/:id/link-click`                                |
| Who's Going                                                 | `GET /posts/:id/attendees?state=going` (paged); the host also sees `requested`  |
| Accept / Decline (host)                                     | `POST /posts/:id/attendees/:userId/accept` or `/decline`                        |
| ⋯ → Cancel / Delete (host)                                  | `POST /posts/:id/cancel`, `DELETE /posts/:id` (409 → offer Cancel)              |
| ⋯ → Report activity                                         | explore's report flow (`ReportPostFlow`), `POST /posts/:id/report`              |
| Share                                                       | the post link, `https://ajalatrvl.com/posts/<id>` (`LINKS_HOST` in the rules)   |

The two chat actions are callbacks (`onMessageHost`, `onOpenGroupChat`) that the route file
`app/(app)/post/[id].tsx` wires to `chatRoutes.start`, so this feature never imports a chat screen.

## Comments (spec §2.18)

| Element                                   | API                                                                         |
| ----------------------------------------- | --------------------------------------------------------------------------- |
| "Comments" and the count                  | `GET /posts/:id/comments` — top level, oldest first; `total` for the header |
| "View N replies"                          | `GET /posts/:id/comments/:commentId/replies` (loaded when opened)           |
| Send, or Reply ("Replying to …")          | `POST /posts/:id/comments { body (1–1000), parentId? }` — optimistic        |
| ⋯ → Delete comment (when `canDelete`)     | `DELETE /posts/:id/comments/:commentId` (asks first)                        |
| ⋯ → Report comment (someone else's)       | `POST /posts/:id/comments/:commentId/report { reason, details? }`           |

- One level of replies. Replying to a reply goes under the same top-level comment (`threadOf`).
- A deleted top-level comment that still has replies comes back `deleted: true` with no author or
  body and reads "Comment deleted"; deleting one without replies removes it.
- `canDelete` is your own comments, or any on a post you host.
- 409 `POST_CANCELLED` (or a post already cancelled) closes the composer with a line saying so.
- A report's 403 `REPORTING_PAUSED`, 409 (already reported) and 400 are said in the dialog.
- 404 now means the post is gone; there is no "comments unavailable" state any more.

## Gaps

- **Follow** and **mutual friends** are not in the API, so they are left out.
- The design labels every type's button "Join event"; it says the type here ("Join plan").
- The design has no frames for the running order, itinerary, shared cost, link clicks or comment
  threads; they follow the page's existing cards and the Who's Going heading.
- The Plan checklist was removed from the API; the itinerary (read-only lines) replaces it.

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
├── domain/                    PostDetail, PostDetailError, postDetailRules (button state, optimistic RSVP),
│                              commentRules (threads, "Comment deleted", closed comments)
└── presentation/
    ├── screens/               PostDetailScreen
    ├── components/            PostHero, InfoRow/StatTile, JoinBar, LineList, WhoIsGoing, Comments,
    │                          ReportCommentDialog, PostSkeleton
    ├── hooks/                 usePostDetail, useComments / useReplies (view models)
    └── state/                 query keys, use-case hook
```
