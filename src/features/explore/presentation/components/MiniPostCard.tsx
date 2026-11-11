import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Easing, FadeInDown, FadeOutDown, ReduceMotion } from 'react-native-reanimated';

import {
  Host,
  Button,
  MenuButton,
  NativeIcon,
  SkeletonBlock,
  SkeletonPulse,
  Text,
  icons,
  type NativeIconSource,
} from '@shared/components';
import { useFontScale } from '@shared/hooks/useFontScale';
import { useTheme } from '@shared/hooks/useTheme';
import { palette } from '@shared/theme';

import type { PostPreview } from '../../domain/entities/Explore';
import type { ExploreErrorCode } from '../../domain/entities/ExploreError';
import { rsvpAction, spotsLeft, type RsvpAction } from '../../domain/rules/exploreRules';
import { exploreCopy, exploreErrorMessages, typeEmoji, typeLabels } from '../copy';
import { formatPrice, formatShortDay } from '../format';

/**
 * The card a tapped pin opens (Figma "Map_Overlay_Mini"): the cover photo at the
 * left with the type tag on it; the title, "Oct 4 · The Nest", "47 joined · 13
 * left"; then the join button and Preview. × closes it, ⋯ offers Report.
 *
 * The button follows the post's own state (spec §2.13): RSVP, with its price
 * when it has one (a card shows the price or nothing), or Request to join on a
 * private post; Requested, Going and Waitlisted once done; "You're hosting" on
 * the person's own post, never Join; nothing once declined or removed. A post
 * with a link opens it as it joins (see `useJoinPost`).
 *
 * Motion: it rises 12pt and fades in over 250ms, and sinks out in 180ms (a fade
 * alone under Reduce Motion). At large text the buttons stack.
 */

const IMAGE_WIDTH = 116;
const card = { radius: 16, padding: 12 };
/** The narrowest button row that fits the join and Preview buttons next to each other. */
const SIDE_BY_SIDE_MIN = 210;

export const miniCardEntering = FadeInDown.duration(250)
  .easing(Easing.out(Easing.cubic))
  .withInitialValues({ opacity: 0, transform: [{ translateY: 12 }] })
  .reduceMotion(ReduceMotion.System);
export const miniCardExiting = FadeOutDown.duration(180).reduceMotion(ReduceMotion.System);

export type MiniPostCardProps = {
  post: PostPreview | null;
  loading: boolean;
  error: ExploreErrorCode | null;
  joinError: ExploreErrorCode | null;
  joining: boolean;
  onRetry: () => void;
  onJoin: (post: PostPreview, action: RsvpAction) => void;
  onPreview: () => void;
  /** Chosen from the ⋯ menu. */
  onReport: () => void;
  onClose: () => void;
};

export function MiniPostCard(props: MiniPostCardProps) {
  const theme = useTheme();
  return (
    <View
      style={{
        borderRadius: card.radius,
        backgroundColor: theme.card,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.16,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
      }}
    >
      {props.post ? (
        <Loaded {...props} post={props.post} />
      ) : props.error ? (
        <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text variant="bodySm" tone="muted" className="flex-1" accessibilityLiveRegion="polite">
            {props.error === 'notFound' ? exploreErrorMessages.notFound : exploreCopy.card.loadFailed}
          </Text>
          {props.error !== 'notFound' ? (
            <Button
              label={exploreCopy.card.retry}
              size="sm"
              variant="secondary"
              surface={theme.card}
              onPress={props.onRetry}
            />
          ) : null}
          <CornerButton icon={icons.close} label={exploreCopy.card.close} onPress={props.onClose} />
        </View>
      ) : (
        <SkeletonPulse>
          <View style={{ flexDirection: 'row' }}>
            <SkeletonBlock width={IMAGE_WIDTH} height={132} radius={0} />
            <View style={{ flex: 1, padding: card.padding, gap: 8 }}>
              <SkeletonBlock width="80%" height={16} />
              <SkeletonBlock width="50%" height={12} />
              <SkeletonBlock width="40%" height={12} />
              <SkeletonBlock height={34} radius={17} />
            </View>
          </View>
        </SkeletonPulse>
      )}
    </View>
  );
}

function Loaded({
  post,
  joinError,
  joining,
  onJoin,
  onPreview,
  onReport,
  onClose,
}: MiniPostCardProps & { post: PostPreview }) {
  const theme = useTheme();
  const fontScale = useFontScale();
  // Side by side only when the column has room for both labels ("Request to join" and
  // "Preview" need about 210pt): bigger text or a narrower phone stacks them.
  const [columnWidth, setColumnWidth] = useState<number | null>(null);
  const stacked = fontScale > 1.3 || (columnWidth !== null && columnWidth < SIDE_BY_SIDE_MIN * fontScale);
  const action = rsvpAction(post);
  const when = [formatShortDay(post.startAt), post.placeName].filter(Boolean).join(' · ');
  const left = spotsLeft(post.goingCount, post.capacity);
  const counts = [
    exploreCopy.card.joined(post.goingCount),
    left !== null && left > 0 ? exploreCopy.card.left(left) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={{ flexDirection: 'row' }}>
      <View style={{ width: IMAGE_WIDTH, backgroundColor: theme.skeleton }}>
        {post.imageUrl ? (
          <Image
            source={{ uri: post.imageUrl }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            contentFit="cover"
            transition={200}
            accessibilityIgnoresInvertColors
          />
        ) : null}
        <View
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 3,
            paddingHorizontal: 7,
            paddingVertical: 2,
            borderRadius: 999,
            backgroundColor: theme.accentSoft,
          }}
        >
          <Text variant="bodyXs" maxFontSizeMultiplier={1.3} style={{ fontSize: 10 }}>
            {typeEmoji[post.type]}
          </Text>
          <Text variant="labelXs" maxFontSizeMultiplier={1.3} style={{ color: palette.ink, fontSize: 10 }}>
            {typeLabels[post.type]}
          </Text>
        </View>
      </View>

      <View style={{ flex: 1, padding: card.padding }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
          <Text variant="headingSm" numberOfLines={2} className="flex-1">
            {post.title}
          </Text>
          <MenuButton
            actions={[
              { label: exploreCopy.card.report, systemImage: 'flag', destructive: true, onPress: onReport },
            ]}
            accessibilityLabel={exploreCopy.card.more}
            cancelLabel={exploreCopy.card.cancel}
          >
            <CornerFace icon={icons.more} />
          </MenuButton>
          <CornerButton icon={icons.close} label={exploreCopy.card.close} onPress={onClose} />
        </View>
        {when ? (
          <Text variant="bodyXs" tone="muted" className="mt-4" numberOfLines={1}>
            {when}
          </Text>
        ) : null}
        <Text variant="bodyXs" tone="muted" className="mt-2">
          {counts}
        </Text>

        <View
          onLayout={(e) => setColumnWidth(e.nativeEvent.layout.width)}
          style={{
            marginTop: 10,
            flexDirection: stacked ? 'column' : 'row',
            alignItems: stacked ? 'stretch' : 'center',
            gap: 8,
          }}
        >
          {action.kind !== 'none' ? (
            <View style={{ flex: stacked ? undefined : 1 }}>
              <Button
                label={actionLabel(action)}
                size="sm"
                fullWidth
                loading={joining}
                disabled={!actionable(action)}
                onPress={() => onJoin(post, action)}
                testID="explore-card-join"
              />
            </View>
          ) : null}
          <Button
            label={exploreCopy.card.preview}
            size="sm"
            variant="secondary"
            surface={theme.card}
            fullWidth={stacked}
            onPress={onPreview}
          />
        </View>
        {joinError ? (
          <Text variant="bodyXs" tone="destructive" className="mt-6" accessibilityLiveRegion="polite">
            {exploreErrorMessages[joinError]}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const actionable = (action: RsvpAction) => action.kind === 'join';

function actionLabel(action: RsvpAction): string {
  const c = exploreCopy.card;
  switch (action.kind) {
    case 'join':
      if (action.request) return c.request;
      // The price or nothing: no price is not the same as free (backend answers C1).
      return action.price ? c.rsvpPriced(formatPrice(action.price)) : c.rsvp;
    case 'requested':
      return c.requested;
    case 'going':
      return c.going;
    case 'waitlisted':
      return c.waitlisted(action.position);
    case 'hosting':
      return c.hosting;
    default:
      return '';
  }
}

/** A small round control in the card's corner; a 44pt target around a 26pt circle. */
function CornerButton({
  icon,
  label,
  onPress,
}: {
  icon: NativeIconSource;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={9} accessibilityRole="button" accessibilityLabel={label}>
      <CornerFace icon={icon} />
    </Pressable>
  );
}

/** The small round face of the card's corner buttons (⋯ and ×). */
function CornerFace({ icon }: { icon: NativeIconSource }) {
  const theme = useTheme();
  return (
    <View
      style={{
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: theme.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Host matchContents pointerEvents="none" ignoreSafeArea="all">
        <NativeIcon source={icon} size={11} color={theme.foreground} />
      </Host>
    </View>
  );
}
