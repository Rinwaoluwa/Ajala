import { Stack } from 'expo-router';

import { useStackScreenOptions } from '@shared/hooks/useStackScreenOptions';

/** The sign-up flow. Its pending verification is held by the auth layout above. */
export default function SignUpLayout() {
  return <Stack screenOptions={useStackScreenOptions()} />;
}
