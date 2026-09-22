# app/ — Expo Router route tree

Route files stay thin: they read params, render a screen exported from a feature's public
barrel, and nothing else. All logic lives in `src/features/<feature>/presentation`.

```
app/
├── _layout.tsx                 root providers + auth/onboarding gate
├── (auth)/                     sign-in, sign-up, OTP, forgot/reset password
├── (onboarding)/               tour, city detection, interest selection
├── (tabs)/
│   ├── _layout.tsx             five-tab bar (IA-01 → IA-05) with the centre Create FAB
│   ├── index.tsx               Home / newsfeed        -> @features/home
│   ├── explore.tsx             Explore                -> @features/explore
│   ├── create.tsx              Create action sheet    -> @features/create-post
│   ├── map.tsx                 Map                    -> @features/map
│   └── profile.tsx             Profile                -> @features/profile
├── post/[id].tsx               post detail            -> @features/post-detail
├── chat/index.tsx, [threadId].tsx                     -> @features/chat
├── modals/                     paywall, city picker, report, attendee list
├── settings/                   settings stack         -> @features/settings
└── +not-found.tsx
```

Example of the entire contents of a route file:

```tsx
// app/(tabs)/explore.tsx
import { ExploreScreen } from '@features/explore';
export default ExploreScreen;
```
