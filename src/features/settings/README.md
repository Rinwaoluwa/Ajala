# Feature: Settings

**FRD coverage:** §14, MOB-010, MOB-011, MOB-186
**Owner:** _unassigned_ — put your name here when you pick this feature up.

Settings and its pages (Figma, light and dark), over API map §10:

| Screen | Route | API |
| --- | --- | --- |
| Settings (hub) | `/(app)/settings` | `GET /me`, `GET /me/posts?status=draft` (count), `GET /app/config` (Help, About), Log out → auth's sign-out |
| Edit profile | `settings/edit-profile` | `PATCH /me` (only what changed; languages, links, `travelStyles` and `favouriteCityIds` merged into `extras`), `POST /me/avatar`, `GET /handles/availability`, `GET /cities`, `GET /cities/popular` |
| Account & security | `settings/account` | — (menu; "Change password" reads "Set a password" for a Google/Apple-only account) |
| Change email | `settings/change-email` | `POST /me/email/change` → code → `/confirm`; "Confirm it's you" on 403 |
| Change / set password | `settings/change-password` | `POST /me/password`; or, with no `email` identity, `POST /me/password/set` (re-auth on 403) |
| Connected accounts | `settings/connected-accounts` | `identities` on `GET /me`; Unlink → `DELETE /me/identities/{provider}` (re-auth on 403; 409 `LAST_SIGN_IN_METHOD` offers "Set a password") |
| Sign-in activity | `settings/sessions` | `GET /me/sessions`, `DELETE /me/sessions/:id`; Sign out everywhere → `POST /auth/logout/all`, then auth's sign-out |
| Download my data | `settings/data-export` | `GET /me/export` (404 = never asked), `POST /me/export` (once a day; re-auth on 403); Download opens `downloadUrl` in the browser |
| Delete account | `settings/delete-account` | `DELETE /me`; "Confirm it's you" on 403; then signs out |
| Drafts | `settings/drafts` | `GET /me/posts?status=draft` (filtered by type on the phone), `DELETE /posts/:id`; Continue editing → `/(app)/create/[type]?draftId=` |
| Notifications | `settings/notifications` | `GET/PATCH /me/settings`, optimistic with rollback |
| Appearance | `settings/appearance` | none — kept on the phone (`@shared/state/appearance`), applied at launch from `app/_layout.tsx` |
| Privacy & safety | `settings/privacy` | `PATCH /me/settings` (`hiddenFromSearch`, `showCurrentCity`, `openToMeetToday`, `sharePlans`, `readReceipts`, `dmPermission`), `PATCH /me/analytics { enabled }`; all optimistic with rollback |
| Your reports | `settings/reports` | `GET /me/reports` (paged, "Show more") |
| Safety tips | `settings/safety-tips` | static |
| Blocked accounts | `settings/blocked` | `GET /me/blocks`, `DELETE /users/:id/block` |
| About AJALA | `settings/about` | `GET /app/config` |

Screens take callbacks (`onBack`, `onNavigate(to)`); `app/(app)/settings/*` turns them into routes
with `settingsRoutes`. That map is now 17 entries, past the architecture's ten: the account pages
are the obvious piece to split into their own feature (spec §7 suggests `features/account`).

## Notes

- **Its own `/me` cache.** Settings reads `GET /me` into its own shape under `['settings', 'account']`.
  `sharedQueryKeys.me` holds the profile feature's shape, and one key must keep one shape — so after
  an edit Settings replaces its own copy and *invalidates* the shared key, and every other reader
  refetches in its own shape.
- **Re-auth (spec §2.5).** Change email, set a first password, unlink, data export and delete
  answer 403 REAUTH_REQUIRED when the last re-auth is over five minutes old. `ConfirmItsYouDialog`
  then asks for the password (`POST /me/reauth { password }`), or, for an account with no `email`
  identity, emails a code on opening (`POST /me/reauth/code`) and sends it as soon as six digits are
  typed (`POST /me/reauth { code }`). The original request is then sent again.
- **A 401 is the password or code here.** Auth's request wrapper turns a second 401 into "session
  expired". On change password, re-auth and the email code that 401 is the person's input, so it is
  read as "wrong password" / "wrong code" (`toSettingsError` context). A session that really ended
  signs the person out by itself.
- **Analytics** is read from `analyticsOptOut` but changed only with `PATCH /me/analytics`; the
  settings patch type leaves it out, as the API's does.
- **Open to meet today** is switched off by the server at the person's midnight; the screen just
  shows what `GET /me/settings` says, so a stale cache can show it on until the next read.
- **Sign out everywhere** ends this session on the server too, so auth's own `POST /auth/logout`
  that follows (through `useSignOut`, the same path as Log out) fails quietly; the local sign-out
  still happens.
- **Handle cooldown.** `HANDLE_COOLDOWN` reads "once every 30 days"; the date is added only if the
  server still sends `details.availableAt`, which the spec no longer documents.
- **Travel styles** are the API's 36 slugs, with labels kept in `domain/rules/travelStyles.ts`
  (profile setup has the same words but does not export them). Slugs outside the list are dropped
  when read, since saving them back would be refused.
- **Display name** is one field over the API's first and last name: the first word is the first
  name (API map §12).

## Gaps (flag to product)

- **Notifications:** Nearby activities and Recommendations have no fields; shown off and inert.
  `notifyNewComment` and `notifySubscription` are stored but not drawn.
- **Edit profile:** gender and interests are editable in the API but not drawn here.
- **Analytics SDK:** there is no analytics client in the app yet (no `core/analytics` wrapper), so
  the opt-out is stored on the server only. Gate the SDK on `analyticsOptOut` when it lands (spec §7.11).
- **Log out** does not unregister the push token yet (`POST /me/devices/unregister`): push is not built.
- **Not drawn but in the API:** photo gallery.
