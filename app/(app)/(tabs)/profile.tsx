import { useState } from 'react';

import { useSignOut } from '@features/auth';
import { Button, PlaceholderScreen } from '@shared/components';

/**
 * PLACEHOLDER — the profile (API map §9) is not built yet. It keeps the way to
 * sign out, which the old home placeholder carried.
 */
export default function ProfileRoute() {
  const signOut = useSignOut();
  // Signing out tells the API first, which can take a moment on a slow network.
  const [signingOut, setSigningOut] = useState(false);

  return (
    <PlaceholderScreen title="Profile" body="Your passport, badges and posts will appear here.">
      <Button
        label="Sign out"
        variant="secondary"
        loading={signingOut}
        onPress={() => {
          setSigningOut(true);
          void signOut();
        }}
      />
    </PlaceholderScreen>
  );
}
