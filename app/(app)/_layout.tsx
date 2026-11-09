import { Redirect, router, Stack } from 'expo-router';
import { View } from 'react-native';

import {
  nextStepRoutes,
  signInRoutes,
  useAuthState,
  useAuthorizedRequest,
  useEntryCheck,
} from '@features/auth';
import { ChatRealtime, chatRoutes } from '@features/chat';
import { LocationGate } from '@features/location-access';
import { PushNotifications } from '@features/notifications';
import { paymentRoutes } from '@features/payment';
import { postDetailRoutes } from '@features/post-detail';
import { useStackScreenOptions } from '@shared/hooks/useStackScreenOptions';
import { ApiRequesterProvider } from '@shared/state/apiRequester';

/**
 * Push notifications are switched off for now: nothing asks for permission or
 * registers this phone with POST /me/devices. The backend wants a Firebase (FCM)
 * token on iOS as well as Android (backend-requests A13), which needs Firebase
 * Messaging in the app first. Set this to true to turn push back on; the push
 * code itself is unchanged.
 */
const PUSH_ENABLED = false;

/**
 * The signed-in app.
 *
 * Guards once, here, rather than in each screen. It waits for the stored session
 * to come out of the keychain before deciding: redirecting while that is still
 * loading would bounce a signed-in person to the sign-in screen on every cold
 * start. The launch overlay is still up during that wait, so nothing flashes.
 *
 * A session restored from the last launch is then checked against `GET /me`
 * (`useEntryCheck`): updated terms, or an unfinished profile, come before the app.
 *
 * Location is required to use Ajala: without it, the app is held behind "Turn on
 * location to explore AJALA", which moves on by itself once it is allowed.
 *
 * Push notifications start here too, past every gate, so the permission prompt
 * never comes before sign-in or on top of onboarding.
 */
export default function AppLayout() {
  const auth = useAuthState();
  const entry = useEntryCheck();
  const request = useAuthorizedRequest();
  const screenOptions = useStackScreenOptions();

  if (auth.status === 'loading') return null;
  if (auth.status === 'signedOut') return <Redirect href={signInRoutes.options} />;
  if (entry.redirectTo) return <Redirect href={nextStepRoutes[entry.redirectTo]} />;
  // Usually a few hundred milliseconds, much of it under the launch overlay.
  if (entry.pending) return <View className="flex-1 bg-background" />;

  return (
    // Shared pieces that call the API themselves (the bookmark on a post card) do
    // so as the signed-in person through this, since shared code cannot import auth.
    <ApiRequesterProvider request={request}>
      {/* One live chat connection for the whole signed-in app (off in demo mode). */}
      <ChatRealtime />
      <LocationGate>
        {/* Push: asks for permission once the person is in the app (signed in,
            onboarding done, location allowed), registers this phone, and opens
            a tapped push where its inbox row would go. Off for now: PUSH_ENABLED. */}
        {PUSH_ENABLED ? (
          <PushNotifications
            onOpenPost={(id) => router.push({ pathname: postDetailRoutes.post, params: { id } })}
            onOpenMessages={(id) =>
              id ? router.push({ pathname: chatRoutes.thread, params: { id } }) : router.push(chatRoutes.list)
            }
            onOpenPaywall={() => router.push(paymentRoutes.travelPaywall)}
          />
        ) : null}
        <Stack screenOptions={screenOptions}>
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          {/* Choosing a city slides up over everything and closes back down, like a compose screen. */}
          <Stack.Screen name="travel" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="travel-paywall" options={{ presentation: 'pageSheet', animation: 'fade' }} />
        </Stack>
      </LocationGate>
    </ApiRequesterProvider>
  );
}
