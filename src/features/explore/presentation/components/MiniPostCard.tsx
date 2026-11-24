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
import { layout, textStyles } from '@shared/theme';
import { useTypeColors } from '@shared/theme/postTypeColors';

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
 * when it has one (a card shows the price or nothing), or Join on a private
 * post (which asks its host); Requested, Going and Waitlisted once done;
 * "You're hosting" on the person's own post, never Join; nothing once declined
 * or removed. A post with a link opens it as it joins (see `useJoinPost`).
 *
 * The two buttons sit side by side while both labels fit on one line each, and
 * stack when they would not (a long label, a narrow phone, large text): a label
 * is never broken over two lines.
 *
 * Motion: it rises 12pt and fades in over 250ms, and sinks out in 180ms (a fade
 * alone under Reduce Motion).
 */

const IMAGE_WIDTH = 116;
const card = { radius: 16, padding: 12 };
/** Between the two buttons. */
const BUTTON_GAP = 8;

/**
 * How wide a button needs to be to keep its label on one line: the label at a
 * generous average glyph (0.6 em; the face runs about 0.55) plus the button's
 * padding. Generous on purpose: stacking a row that would have fitted costs a
 * little height, and a label broken in two looks broken.
 */
const buttonNeeds = (label: string, fontScale: number) =>
  Math.ceil(label.length * textStyles.labelSm.fontSize * 0.6 * fontScale) + layout.button.paddingX * 2;

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
  const typeColors = useTypeColors();
  const fontScale = useFontScale();
  const action = rsvpAction(post);
  const joinLabel = actionLabel(action);
  // Side by side only when the column has room for both labels on one line each (see the
  // note above). Until the column is measured it is taken as roomy: most cards are.
  const [columnWidth, setColumnWidth] = useState<number | null>(null);
  const needed =
    (action.kind !== 'none' ? buttonNeeds(joinLabel, fontScale) + BUTTON_GAP : 0) +
    buttonNeeds(exploreCopy.card.preview, fontScale);
  const stacked = columnWidth !== null && columnWidth < needed;
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
      {/* No photo (they are optional): the type's own colour, not a grey that reads as loading. */}
      <View
        style={{ width: IMAGE_WIDTH, backgroundColor: post.imageUrl ? theme.skeleton : typeColors[post.type].cover }}
      >
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
            // The type's own colour, as its pill on the home feed (`useTypeColors`).
            backgroundColor: typeColors[post.type].tag,
          }}
        >
          <Text variant="bodyXs" maxFontSizeMultiplier={1.3} style={{ fontSize: 10 }}>
            {typeEmoji[post.type]}
          </Text>
          <Text
            variant="labelXs"
            maxFontSizeMultiplier={1.3}
            style={{ color: typeColors[post.type].softLabel, fontSize: 10 }}
          >
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
            gap: BUTTON_GAP,
          }}
        >
          {action.kind !== 'none' ? (
            <View style={{ flex: stacked ? undefined : 1 }}>
              <Button
                label={joinLabel}
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
