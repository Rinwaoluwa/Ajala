import { router } from 'expo-router';

import { createPostRoutes } from '@features/create-post';
import { DraftsScreen } from '@features/settings';

/** Settings / Drafts; Continue editing opens the create wizard on that draft. */
export default function DraftsRoute() {
  return (
    <DraftsScreen
      onBack={() => router.back()}
      onContinue={(draft) =>
        router.push({ pathname: createPostRoutes.wizard, params: { type: draft.type, draftId: draft.id } })
      }
    />
  );
}
