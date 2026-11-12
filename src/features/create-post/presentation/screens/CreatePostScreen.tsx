import { useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import Animated, { FadeInLeft, FadeInRight, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, LoadingRing, Screen, StatusSheet, Text, Toast } from '@shared/components';
import { haptics } from '@shared/feedback/haptics';
import { useTheme } from '@shared/hooks/useTheme';
import { SCREEN_GUTTER } from '@shared/theme';

import type { CreatePostError } from '../../domain/entities/CreatePostError';
import type { PostKind } from '../../domain/postKinds';
import { createPostErrors, kindCopy, wizardCopy } from '../copy';
import { useCreatePost } from '../hooks/useCreatePost';
import { PublishedSheet } from '../components/PublishedSheet';
import { WizardHeader } from '../components/WizardHeader';
import { BasicsStep } from '../components/steps/BasicsStep';
import { ParticipantsStep } from '../components/steps/ParticipantsStep';
import { PriceStep } from '../components/steps/PriceStep';
import { ReviewStep } from '../components/steps/ReviewStep';
import { ScheduleStep } from '../components/steps/ScheduleStep';
import { OwnAreaOnlyContext } from '../state/ownArea';

/**
 * The create wizard (Figma New meetup / event / plan / group activity, light
 * and dark): five steps under one header (four for a Plan, which has no price
 * step), Next at the foot, Publish on the review step, then the published or
 * "That didn't go through" sheet. The price step adds "Skip" beside Next, since
 * a price and a link are both optional.
 *
 * Motion: a step slides in a few points from the side it comes from (forward
 * from the right, back from the left) while fading, 240ms; Reduce Motion keeps
 * only the fade. The page starts again at the top on each step.
 *
 * Leaving: the header's arrow goes back a step, and leaves from the first. A
 * post with unsaved changes asks first — save as a draft, discard, or keep
 * editing — whether the person taps back, swipes back or uses Android's back.
 * Straight after Save draft, with nothing changed since, it just leaves.
 */

const SLIDE_MS = 240;
const SAVED_NOTICE_MS = 2000;

export type CreatePostScreenProps = {
  kind: PostKind;
  /** A saved draft to carry on with (Settings / Drafts → Continue editing). */
  draftId?: string | null;
  /** A live post to edit (Edit post from its page): the wizard opens filled in and saves changes. */
  editId?: string | null;
  onClose: () => void;
  /** Published, or (editing) the changes saved: the post's page follows. */
  onPublished: (postId: string) => void;
  /**
   * A free member (MOB-077): the place pickers offer only places around the
   * phone, the only places the server lets them post. False for Pro.
   */
  ownAreaOnly?: boolean;
};

export function CreatePostScreen({
  kind,
  draftId = null,
  editId = null,
  onClose,
  onPublished,
  ownAreaOnly = false,
}: CreatePostScreenProps) {
  const editing = editId !== null;
  const vm = useCreatePost(kind, editId ?? draftId, editing ? 'edit' : 'create');
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const scroll = useRef<ScrollView>(null);
  const copy = kindCopy[kind];
  const header = editing
    ? { title: wizardCopy.edit.title(copy.noun), subtitle: wizardCopy.edit.subtitle }
    : copy.header;
  const done = editing
    ? { title: wizardCopy.edit.savedTitle, message: wizardCopy.edit.savedMessage, action: wizardCopy.edit.savedAction }
    : copy.published;
  const justSaved = useJustSaved(vm.draftSavedAt);

  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [vm.stepIndex]);

  // Back a step, or ask before throwing away a post in progress.
  const published = vm.outcome.kind === 'published';
  // Past the first step, back goes back a step; on the first, it only asks when leaving
  // would lose something — never straight after Save draft with nothing changed since.
  const guard = !published && (vm.stepIndex > 0 || vm.unsavedChanges);
  useEffect(() => {
    // iOS's swipe-back cannot be paused for a question, so it is off while one is needed.
    navigation.setOptions({ gestureEnabled: !guard });
  }, [navigation, guard]);

  usePreventRemove(guard, ({ data }) => {
    if (vm.stepIndex > 0) {
      vm.back();
      return;
    }
    const leave = () => navigation.dispatch(data.action);
    if (!vm.unsavedChanges) {
      leave();
      return;
    }
    haptics.warning();
    Alert.alert(wizardCopy.leave.title(copy.noun), wizardCopy.leave.message, [
      ...(vm.canSaveDraft
        ? [
            {
              text: wizardCopy.leave.save,
              onPress: () =>
                void vm.saveDraft().then((error) => {
                  if (!error) leave();
                  else Alert.alert(wizardCopy.saveDraft, failureMessage(error, copy.noun, true));
                }),
            },
          ]
        : []),
      { text: wizardCopy.leave.discard, style: 'destructive' as const, onPress: leave },
      { text: wizardCopy.leave.stay, style: 'cancel' as const },
    ]);
  });

  const saveDraft = () =>
    void vm.saveDraft().then((error) => {
      if (error) Alert.alert(wizardCopy.saveDraft, failureMessage(error, copy.noun, true));
    });

  // The sheet's button and its dismissal both lead on; only the first may.
  const finished = useRef(false);
  const finish = () => {
    if (vm.outcome.kind !== 'published' || finished.current) return;
    finished.current = true;
    onPublished(vm.outcome.postId);
  };

  // The first step arrives with the screen's own push; only later steps slide in.
  // Fading it in as well added a quarter of a second before the wizard could be used.
  const [openedOn] = useState(vm.stepIndex);
  const [stepped, setStepped] = useState(false);
  if (!stepped && vm.stepIndex !== openedOn) setStepped(true);
  const entering = stepped
    ? (vm.direction > 0 ? FadeInRight : FadeInLeft).duration(SLIDE_MS).reduceMotion(ReduceMotion.System)
    : undefined;

  const failed =
    vm.outcome.kind === 'failed' && vm.outcome.error.code !== 'invalid' ? vm.outcome.error : null;

  if (vm.loadingDraft || vm.draftFailed) {
    return (
      <Screen edges={['top']} padded={false}>
        <WizardHeader
          title={header.title}
          subtitle={header.subtitle}
          step={0}
          stepCount={vm.stepCount}
          onBack={onClose}
          onSaveDraft={() => undefined}
          canSaveDraft={false}
          saving={false}
          justSaved={false}
          showSaveDraft={!editing}
        />
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: SCREEN_GUTTER, gap: 16 }}
        >
          {vm.draftFailed ? (
            <>
              <Text variant="bodySm" tone="muted" className="text-center" accessibilityLiveRegion="polite">
                {wizardCopy.draftLoadFailed}
              </Text>
              <Button label={wizardCopy.publishFailed.action} onPress={vm.retryDraft} />
            </>
          ) : (
            <LoadingRing size={40} accessibilityLabel={wizardCopy.loadingDraft} />
          )}
        </View>
      </Screen>
    );
  }

  return (
    <OwnAreaOnlyContext.Provider value={ownAreaOnly}>
      <Screen edges={['top']} padded={false}>
        <WizardHeader
          title={header.title}
          subtitle={header.subtitle}
          step={vm.stepIndex}
          stepCount={vm.stepCount}
          onBack={() => (vm.stepIndex > 0 ? vm.back() : onClose())}
          onSaveDraft={saveDraft}
          canSaveDraft={vm.canSaveDraft}
          saving={vm.savingDraft}
          justSaved={justSaved}
          showSaveDraft={!editing}
        />

        <ScrollView
          // Android draws scrolled content past the edges unless told to clip, over the header above.
          style={{ flex: 1, overflow: 'hidden' }}
          ref={scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={{
            paddingHorizontal: SCREEN_GUTTER,
            paddingTop: 24,
            paddingBottom: vm.step === 'review' ? Math.max(insets.bottom, 16) + 24 : 32,
          }}
        >
          <Animated.View key={vm.step} entering={entering}>
            {vm.step === 'basics' ? <BasicsStep vm={vm} /> : null}
            {vm.step === 'schedule' ? <ScheduleStep vm={vm} /> : null}
            {vm.step === 'participants' ? <ParticipantsStep vm={vm} /> : null}
            {vm.step === 'price' ? <PriceStep vm={vm} /> : null}
            {vm.step === 'review' ? <ReviewStep vm={vm} /> : null}
          </Animated.View>
        </ScrollView>

        {vm.step === 'review' ? null : (
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: theme.border,
              paddingHorizontal: SCREEN_GUTTER,
              paddingTop: 16,
              paddingBottom: Math.max(insets.bottom, 16),
              backgroundColor: theme.background,
            }}
          >
            {/* Skip and Next sit side by side, and stack when large text leaves no room. */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {/* No Skip when editing a live post: its price is fixed, and Skip would clear the link. */}
              {vm.step === 'price' && !editing ? (
                <View style={{ flexGrow: 1, flexBasis: 140 }}>
                  <Button
                    label={wizardCopy.skipPrice}
                    variant="secondary"
                    size="lg"
                    fullWidth
                    onPress={vm.skipPrice}
                    testID="create-skip-price"
                  />
                </View>
              ) : null}
              <View style={{ flexGrow: 1, flexBasis: 140 }}>
                <Button
                  label={vm.locating ? wizardCopy.findingPlace : wizardCopy.next}
                  size="lg"
                  fullWidth
                  onPress={() => void vm.next()}
                  disabled={!vm.canContinue && !vm.locating}
                  loading={vm.locating}
                  testID="create-next"
                />
              </View>
            </View>
          </View>
        )}

        {/* Above the footer's buttons, so it never covers Next. */}
        <Toast
          visible={justSaved}
          message={wizardCopy.draftSaved}
          bottom={(vm.step === 'review' ? 0 : 80) + Math.max(insets.bottom, 16) + 8}
        />

        <PublishedSheet
          isPresented={vm.outcome.kind === 'published'}
          kind={kind}
          title={done.title}
          message={done.message}
          actionLabel={done.action}
          onAction={finish}
          // Confetti for a new post; not for saving changes to one already live.
          celebrate={!editing}
        />
        <StatusSheet
          isPresented={failed !== null}
          tone="error"
          title={wizardCopy.publishFailed.title}
          message={failureMessage(failed, copy.noun, editing)}
          actionLabel={wizardCopy.publishFailed.action}
          onAction={vm.publish}
          onDismiss={vm.clearOutcome}
        />
      </Screen>
    </OwnAreaOnlyContext.Provider>
  );
}

/** What the error sheet says: the design's line for a dropped connection, the reason otherwise. */
/** `saving`: the failure was a Save draft (or Save changes), not a Publish, so it says "save". */
function failureMessage(error: CreatePostError | null, noun: string, saving = false): string {
  if (!error || error.code === 'network' || error.code === 'unknown') {
    return saving ? wizardCopy.publishFailed.draftMessage(noun) : wizardCopy.publishFailed.message(noun);
  }
  // Save draft has no review list to show them on, so what the server turned down is said here.
  if (error.code === 'invalid' && error.fieldErrors.length) {
    return [createPostErrors.invalid, ...error.fieldErrors.map((e) => e.message)].join('\n');
  }
  if (error.code === 'eventMonthlyCap' && error.resetsAt) {
    const when = new Date(error.resetsAt);
    if (!Number.isNaN(when.getTime())) {
      const day = when.toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
      return `${createPostErrors.eventMonthlyCap} You can publish another from ${day}.`;
    }
  }
  return createPostErrors[error.code];
}

/** True for a moment after a draft is saved, so the header can say so. */
function useJustSaved(savedAt: number | null): boolean {
  // The save whose notice has run its course.
  const [expired, setExpired] = useState<number | null>(null);
  useEffect(() => {
    if (savedAt === null) return;
    const timer = setTimeout(() => setExpired(savedAt), SAVED_NOTICE_MS);
    return () => clearTimeout(timer);
  }, [savedAt]);
  return savedAt !== null && savedAt !== expired;
}
