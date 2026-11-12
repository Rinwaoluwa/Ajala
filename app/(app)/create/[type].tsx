import { Redirect, router, useLocalSearchParams } from 'expo-router';

import { CreatePostScreen, POST_KINDS } from '@features/create-post';
import { paymentRoutes, useSubscription } from '@features/payment';

/**
 * The create wizard for the type chosen in "Create something" (API map §5), or,
 * with `draftId`, a saved draft carried on from Settings / Drafts, or, with
 * `editId`, a live post being edited from its page.
 *
 * A Plan is a Pro feature (10 Nov): a new one, or a draft carried on, sends
 * someone without Travel Pro to the paywall instead. Editing a Plan already
 * live is left alone, so a host whose subscription lapsed can still fix it.
 */
export default function CreateWizardRoute() {
  const { type, draftId, editId } = useLocalSearchParams<{ type: string; draftId?: string; editId?: string }>();
  const { isPro, loading } = useSubscription();
  const kind = POST_KINDS.find((k) => k.kind === type)?.kind;
  if (!kind) return <Redirect href="/(app)/(tabs)" />;
  if (kind === 'plan' && !editId && !loading && !isPro) {
    return <Redirect href={{ pathname: paymentRoutes.travelPaywall, params: { reason: 'plans' } }} />;
  }

  return (
    <CreatePostScreen
      kind={kind}
      draftId={draftId ?? null}
      editId={editId ?? null}
      // A free member may post only near where they are (MOB-077): the pickers offer only that.
      ownAreaOnly={!isPro}
      onClose={() => (router.canGoBack() ? router.back() : router.replace('/(app)/(tabs)'))}
      onPublished={(id) => {
        // An edit returns to the post page it came from, which redraws with the changes:
        // replacing the wizard with a second copy of that page flashed a blank screen while
        // it loaded, and left the post twice in the back stack.
        if (editId && router.canGoBack()) router.back();
        else router.replace({ pathname: '/(app)/post/[id]', params: { id } });
      }}
    />
  );
}
