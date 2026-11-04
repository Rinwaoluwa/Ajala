import { Redirect, router, useLocalSearchParams } from 'expo-router';

import { CreatePostScreen, POST_KINDS } from '@features/create-post';

/**
 * The create wizard for the type chosen in "Create something" (API map §5), or,
 * with `draftId`, a saved draft carried on from Settings / Drafts.
 */
export default function CreateWizardRoute() {
  const { type, draftId } = useLocalSearchParams<{ type: string; draftId?: string }>();
  const kind = POST_KINDS.find((k) => k.kind === type)?.kind;
  if (!kind) return <Redirect href="/(app)/(tabs)" />;

  return (
    <CreatePostScreen
      kind={kind}
      draftId={draftId ?? null}
      onClose={() => (router.canGoBack() ? router.back() : router.replace('/(app)/(tabs)'))}
      onPublished={(id) => router.replace({ pathname: '/(app)/post/[id]', params: { id } })}
    />
  );
}
