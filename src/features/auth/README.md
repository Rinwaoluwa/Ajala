# Feature: Auth

**FRD coverage:** MOB-001 → MOB-006, MOB-010, MOB-011
**Owner:** _unassigned_ — put your name here when you pick this feature up.

Email sign-up with a 6-digit code, Google & Apple sign-in (with account linking), email sign-in
(with step-up), forgot password (6-digit code), terms acceptance, the session (refresh, sign-out)
and the token every other feature's API calls ride on.

The contract is `docs/api/ajala-api-users-common.md` (§2.2, §2.3, §5, §6) and
`docs/api/screen-to-api-map.md` §1–2. Where this file and those disagree, they win.

## Flows and endpoints

| Flow | Screens (`app/(auth)/…`) | Calls |
| --- | --- | --- |
| Email sign-up | `sign-up/details` → `sign-up/verify` | `POST /auth/signup/email` (202) → `POST /auth/otp/verify { target, code, password }` (200 session + user). Resend: `POST /auth/otp/resend` |
| Email sign-in | `sign-in/email` | `POST /auth/login` (200 token pair) → `GET /me`. 403 `EMAIL_NOT_VERIFIED` goes to `sign-up/verify` (no password sent); 403 `STEP_UP_REQUIRED` goes to `sign-in/verify`, which retries the same login with `otpCode` |
| Google / Apple | `sign-up`, `sign-in` options | `POST /auth/oauth/google` / `apple` with a fresh nonce. 409 `ACCOUNT_LINK_REQUIRED` → `link-account` → `POST /auth/oauth/link { challengeId, code }` |
| Forgot password | `forgot-password` → `forgot-password/verify` → `forgot-password/new-password` | `POST /auth/password/forgot { email }` (202, a 6-digit code is emailed) → `POST /auth/password/verify { email, code }` (200 `{ token }`) → `POST /auth/password/reset { token, newPassword }` (204, every device signed out) → sign in |
| Terms | `terms` | `GET /app/config` for the version, `POST /me/terms/accept` |
| Session | — | `POST /auth/refresh` (single flight, single-use refresh token), `POST /auth/logout` |

Where someone goes after signing in comes from `GET /me`: changed terms first, then
`profileCompletedAt === null` → profile setup, else home. The server decides when a profile is
complete; the app never works it out.

### Password reset details

- The address and the reset token live in `PasswordResetFlowContext`, in memory only — never a
  route param or a URL. Restarting the app mid-reset sends the person back to the email step.
- The code screen reuses `CodeEntryForm` / `useCodeEntry`, so "Resend code" has the same
  60-second countdown as email verification. Resending calls `/password/forgot` again.
- A wrong, expired or used code is one 401 (`invalidCode`). The API burns the code on the fifth
  wrong try, so the hook counts them and from the fifth says to send a new code (`codeUsedUp`).
- On the reset, 400 `PASSWORD_BREACHED` shows under the password; 401 (token ran out after 15
  minutes, or used) raises "Your reset timed out", which goes back to the email step.

### Error codes (spec §5)

Mapped in `data/mappers/authErrorMapper.ts`, per call site where a code means different things
(a 401 is a wrong password on login, a wrong code on the code screens, a dead token on reset).
`SIGNUP_REFUSED` becomes `signUpRefused`, shown as a deliberately vague "We can't create an
account with these details". `VERIFICATION_COOLDOWN` was removed from the API and is gone here.

## Known gaps

- **`deviceCheck` is not sent.** The type is there (`DeviceCheckDto`), but the app has no native
  DeviceCheck / Play Integrity module. The API treats it as optional.
- **Google nonce:** the Google SDK in use cannot pass a nonce to Google, so the ID token carries
  none (see `googleIdentity.ts`).
- **`SIGNUP_REFUSED`:** no endpoint documents which call returns it (spec §8 q5); it is mapped
  wherever it turns up.
- **Hook tests:** the reset hooks are not unit tested (no hook-rendering library in the repo); the
  use cases and repository are.

## Boundary rules

- Everything in this folder is private **except** what `index.ts` exports. Other features import
  `@features/auth` and nothing deeper.
- `presentation/` may import `domain/`. `data/` may import `domain/`. **`domain/` imports nothing**
  from either side, and no React/Expo/network packages at all.
- A screen talks to a hook (the view model). A hook calls use cases. Only a repository implementation
  touches the network, the cache or the device.
- Auth predates the `Result` convention and the TanStack mutation pattern: its use cases throw
  `AuthError` and its hooks hold their own submitting state (docs/ARCHITECTURE.md, "Divergence
  from §8"). New features should not copy that.
- Anything two features both need gets promoted to `src/shared/` in its own PR — never imported
  sideways from another feature folder.

## Layout

```
auth/
├── authModule.ts               composition root: which repository backs the use cases
├── data/
│   ├── datasources/remote/     authApi: one function per endpoint
│   ├── datasources/local/      sessionStorage (secure store)
│   ├── datasources/native/     Apple, Google, nonce, password vault
│   ├── dto/                    wire shapes, from the spec's §6 types
│   ├── mappers/                DTO → entity, ApiError → AuthError
│   └── repositories/           AuthRepositoryImpl (real API; demo mode answers it offline)
├── domain/
│   ├── entities/               Account, AuthSession, AuthError, …
│   ├── repositories/           AuthRepository, SessionStore, PasswordVault contracts
│   ├── rules/                  password, code, field-limit and routing rules (pure)
│   └── usecases/               one per action: SignIn, VerifyEmail, VerifyPasswordResetCode, …
└── presentation/
    ├── screens/                one per route
    ├── components/             CodeEntryForm, step headers, …
    ├── hooks/                  view models
    ├── state/                  AuthContext and the per-flow contexts
    └── navigation/             route paths
```

## Notes

Tokens go through `core/storage/secure` only — never AsyncStorage. Sign-out (and a session ending
any other way) clears the query cache.

Sign-out first runs whatever other features registered with `@core/session/beforeSignOut`, while
the session still works: notifications unregisters this phone's push token there
(`POST /me/devices/unregister`, before `POST /auth/logout`, spec §2.10). Auth can't import
notifications (it imports auth), hence the registry. The tasks get 3 seconds together and their
failures are ignored, so a dead network never keeps anyone signed in.
