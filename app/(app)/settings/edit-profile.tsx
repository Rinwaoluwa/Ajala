import { router } from 'expo-router';

import { EditProfileScreen } from '@features/settings';

/** Settings / Edit profile. */
export default function EditProfileRoute() {
  return <EditProfileScreen onBack={() => router.back()} />;
}
