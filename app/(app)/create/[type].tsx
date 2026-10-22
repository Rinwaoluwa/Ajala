import { router, useLocalSearchParams } from 'expo-router';

import { POST_KINDS } from '@features/create-post';
import { PlaceholderScreen } from '@shared/components';

/** PLACEHOLDER — the create wizard (API map §5) is the next piece of `create-post`. */
export default function CreateWizardRoute() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const kind = POST_KINDS.find((k) => k.kind === type);
  return (
    <PlaceholderScreen
      title={kind ? `New ${kind.title.toLowerCase()}` : 'Create'}
      body="The create wizard comes next."
      onBack={() => router.back()}
    />
  );
}
