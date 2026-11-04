# Feature: Settings

**FRD coverage:** §14, MOB-010, MOB-011, MOB-186
**Owner:** _unassigned_ — put your name here when you pick this feature up.

Settings and its pages (Figma, light and dark), over API map §10:

| Screen | Route | API |
| --- | --- | --- |
| Settings (hub) | `/(app)/settings` | `GET /me`, `GET /me/posts?status=draft` (count), `GET /app/config` (Help, About), Log out → auth's sign-out |
| Edit profile | `settings/edit-profile` | `PATCH /me` (only what changed; languages and links merged into `extras`), `POST /me/avatar`, `GET /handles/availability`, `GET /cities` |
| Account & security | `settings/account` | — (menu) |
| Change email | `settings/change-email` | `POST /me/email/change` → code → `/confirm`; "Confirm it's you" on 403 |
| Change password | `settings/change-password` | `POST /me/password` |
| Connected accounts | `settings/connected-accounts` | `identities` on `GET /me` |
| Sign-in activity | `settings/sessions` | `GET /me/sessions`, `DELETE /me/sessions/:id` |
| Delete account | `settings/delete-account` | `DELETE /me`; "Confirm it's you" on 403; then signs out |
| Drafts | `settings/drafts` | `GET /me/posts?status=draft` (filtered by type on the phone), `DELETE /posts/:id`; Continue editing → `/(app)/create/[type]?draftId=` |
| Notifications | `settings/notifications` | `GET/PATCH /me/settings`, optimistic with rollback |
| Appearance | `settings/appearance` | none — kept on the phone (`@shared/state/appearance`), applied at launch from `app/_layout.tsx` |
| Privacy & safety | `settings/privacy` | `PATCH /me/settings` (`hiddenFromSearch`, `showAge`) |
| Safety tips | `settings/safety-tips` | static |
| Blocked accounts | `settings/blocked` | `GET /me/blocks`, `DELETE /users/:id/block` |
| About AJALA | `settings/about` | `GET /app/config` |

Screens take callbacks (`onBack`, `onNavigate(to)`); `app/(app)/settings/*` turns them into routes
with `settingsRoutes`.

## Notes

- **Its own `/me` cache.** Settings reads `GET /me` into its own shape under `['settings', 'account']`.
  `sharedQueryKeys.me` holds the profile feature's shape, and one key must keep one shape — so after
  an edit Settings replaces its own copy and *invalidates* the shared key, and every other reader
  refetches in its own shape.
- **Re-auth (spec §2.5).** Change email and Delete account answer 403 REAUTH_REQUIRED when the
  last re-auth is over five minutes old; `ConfirmItsYouDialog` asks for the password
  (`POST /me/reauth`) and the request is sent again.
- **A 401 is the password here.** Auth's request wrapper turns a second 401 into "session expired".
  On change password, re-auth and the email code that 401 is the person's input, so it is read as
  "wrong password" / "wrong code" (`toSettingsError` context). A session that really ended signs the
  person out by itself.
- **Display name** is one field over the API's first and last name: the first word is the first
  name (API map §12).

## Gaps (flag to product — API map §12)

- **Edit profile:** Travel style and Favourite locations have no fields; not shown. Gender and
  interests are editable in the API but not drawn here.
- **Notifications:** Nearby activities and Recommendations have no fields; shown off and inert.
- **Privacy:** Show current city, Open to meet today, Share my plan and Reports (no list endpoint)
  are shown inert with "coming soon".
- **Connected accounts:** no unlink call.
- **Google/Apple-only accounts** re-auth with an emailed code (`POST /me/reauth/code`); the dialog
  asks for a password only, so they cannot yet change email or delete from here.
- **Log out** does not unregister the push token yet (`POST /me/devices/unregister`): push is not built.
- **Not drawn but in the API:** data export, analytics opt-out, photo gallery, verification.
