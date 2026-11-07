# Feature: Payment & Subscription

**FRD coverage:** MOB-160 → MOB-167, MOB-058, MOB-062, MOB-108
**Owner:** _unassigned_ — put your name here when you pick this feature up.

The Travel subscription (spec §2.19): what the person has, the Travel paywall, and managing it.
Teleport itself is Home's (`POST`/`DELETE /me/teleport`); it reads `useSubscription` from here.

## Built

| Piece | Call |
| --- | --- |
| `useSubscription()` → `{ isPro, subscription, loading }` | `GET /me/subscription` (`MySubscriptionDto`), one shared query under the spec's `['subscription']` key, 5 minutes fresh. `isPro` is the server's `subscribed` (true through a payment grace period). Home's PRO tag and Travel gate on it; the server still answers 402 to a teleport without it |
| Paywall, not subscribed | The design's benefits and **Subscribe**. This build cannot buy (below), so Subscribe opens a sheet saying purchases aren't available in this build yet — no fake purchase |
| Paywall, subscribed | "Travel is on", renews / ends / grace / complimentary with its date, and **Manage** |
| Manage, `manage: 'apple'` | opens `https://apps.apple.com/account/subscriptions` (wherever it was bought, not where the app runs) |
| Manage, `manage: 'google'` | opens `https://play.google.com/store/account/subscriptions` |
| Manage, `manage: 'web'` | `POST /me/subscription/portal` → `{ url }`, opened |
| Manage, complimentary (`comp`) or none | no button: nothing to manage |

The paywall re-reads the subscription whenever it opens (`useSubscription({ fresh: true })`): it
may have opened because a teleport just came back 402.

Errors by code (spec §5): 503 `SERVICE_UNAVAILABLE` → "Purchases aren't available right now"; a
portal 404 → no web subscription; network and session as everywhere.

## Turning on buying

Everything server-side exists and is typed in `data/datasources/remote/subscriptionApi.ts`
(`challenge`, `verifyApple`, `verifyGoogle`, `checkout`, `confirmCheckout`) and tested for its
paths. What the app still needs:

1. **Store products.** An auto-renewing subscription in App Store Connect and in the Play Console
   (a subscription group on iOS; a base plan on Play), with the same product id on both. The
   paywall's `$10/month` is the design's; show the store product's localised price instead.
2. **A billing library** — StoreKit 2 and Play Billing 7+, e.g. `expo-iap` or
   `react-native-iap` — in a development build. Buy with `appAccountToken` (iOS) /
   `obfuscatedAccountId` (Android) set to the user id.
3. **Device attestation.** iOS: App Attest (`DCAppAttestService`: generate a key, attest it over
   the challenge → `keyId` + `attestation`). Android: Play Integrity (a standard or classic token with
   the challenge as nonce → `integrityToken`). The app has no module for either today: add an
   attestation library, or a small Expo native module with a config plugin.
4. **The flow**, in a `purchase` use case behind `SubscriptionRepository`:
   `GET /me/subscription/challenge` (single use, 5 minutes) → attest → buy → `POST
   /me/subscription/apple { signedTransaction, challenge, keyId, attestation }` or `/google {
   purchaseToken, challenge, integrityToken }` → `setQueryData(['subscription'], answer)`, finish
   the store transaction. **Restore** is the same verify call with the existing purchase.
5. **Errors:** 403 the challenge, device or purchase didn't check out; 409 the purchase belongs to
   another account; 503 subscriptions are off in this environment.
6. **Web (optional):** `POST /me/subscription/checkout { couponCode? }` → open `url`; on return
   `POST /me/subscription/checkout/confirm` (safe to repeat — a "Refresh" button, not polling).
   App Store and Play rules restrict linking out to web payment from the apps.
7. Replace the "not available yet" sheet in `TravelPaywallScreen` (marked `TODO(purchase)`).

Money mutations never queue offline: a purchase either completes with the store and the server or
tells the person why not.

## Boundary rules

- Everything in this folder is private **except** what `index.ts` exports. Other features import
  `@features/payment` and nothing deeper.
- `presentation/` may import `domain/`. `data/` may import `domain/`. **`domain/` imports nothing**
  from either side, and no React/Expo/network packages at all.
- A screen talks to a hook (the view model). A hook calls use cases. Only a repository implementation
  touches the network, the cache or the device.

## Files

```
payment/
├── data/
│   ├── datasources/remote/     subscriptionApi (every §3.11 subscription endpoint, typed)
│   ├── dto/                    MySubscriptionDto, ChallengeDto, Verify*Dto, CheckoutDto, RedirectUrlDto
│   ├── mappers/                DTO → Subscription, ApiError → SubscriptionError
│   └── repositories/           SubscriptionRepositoryImpl (get, portalUrl)
├── domain/
│   ├── entities/               Subscription, SubscriptionError
│   ├── repositories/           SubscriptionRepository
│   ├── rules/                  subscriptionSummary, manageAction, the store settings URLs
│   └── usecases/               loadSubscription, webPortalUrl
└── presentation/
    ├── screens/                TravelPaywallScreen
    ├── hooks/                  useSubscription, useManageSubscription
    ├── state/                  usePaymentUseCases, the subscription query key
    └── navigation/             the paywall's route
```
