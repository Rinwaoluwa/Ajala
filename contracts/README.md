# contracts — the source of truth shared with backend and design

Nothing in here is hand-maintained per platform. Both the app and the API generate from it.

- `openapi/` — OpenAPI 3 spec for the NestJS API. DTOs in `data/dto` are generated from it.
- `websocket/` — event names and payload schemas for chat and live counts.
- `messaging/` — FCM topics and push payload shapes (MOB-180 → MOB-186).
- `analytics/` — the Mixpanel event schema: `app_open`, `post_view`, `post_join`,
  `paywall_view`, `paywall_convert`, `dm_send`, `create_post` (NFR-MOB-08).
- `design-tokens/` — `design-tokens.json` exported from Figma, compiled into `shared/theme`.

Changing a contract is a conversation with the backend or design owner, not a client-side patch.
