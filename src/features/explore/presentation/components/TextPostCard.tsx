import { memo, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { JoinPill, SkeletonBlock, SvgIcon, Text, VectorIcon } from '@shared/components';
import { useFontScale } from '@shared/hooks/useFontScale';
import { useTheme } from '@shared/hooks/useTheme';
import { textStyles } from '@shared/theme';
import { useTypeColors } from '@shared/theme/postTypeColors';

import type { ListedPost } from '../../domain/entities/Explore';
import { exploreCopy, typeLabels } from '../copy';
import { formatCardDay, formatClock } from '../format';
import { usePostDescription } from '../hooks/usePostDescription';

/**
 * A post with no photo, in the Explore list (Home design, the text-only post):
 * the type's tag, the title, the host's words, then when and where side by
 * side with Join at the end of the line.
 *
 * The design's card ends with a row for Comment and Save. Here it does not: the
 * list is for finding something to go to, and both are a tap away on the post.
 *
 * Fitted to the list's width, which is narrower than the design's:
 *   - The day is "Thu 26 Nov"; the year is written only when it is not this
 *     one (`formatCardDay`).
 *   - When keeps its width; where takes what is left and is what is cut short
 *     (one line each, with an ellipsis).
 *   - Where is never cut below nine letters to keep Join beside it: when there
 *     is not that much room (a narrow phone, a long label, larger text) Join
 *     goes under the line, at its end, and where has the whole width.
 *   - When even that is not room enough (the largest text sizes), when and
 *     where stack, each with a line to itself.
 *
 * The words are not in the list's data (backend request B10), so they arrive a
 * moment after the card (`usePostDescription`). Two lines are held open as grey
 * bars until then, so nothing under them moves when they land.
 *
 * The whole card opens the post; Join is the quick RSVP every card has
 * (`JoinPill`). It dips to 98% when pressed, as the photo cards beside it do.
 */

const WORDS_LINES = 3;
const WORDS_HELD = 2;
const ICON = 18;
/** Between a glyph and its lines. */
const ICON_GAP = 8;
/** Either side of the hairline between when and where. */
const FACTS_GAP = 12;
/** Letters of the place there is always room for; its whole name when that is shorter. */
const PLACE_LETTERS = 9;

/**
 * How wide `count` letters of a fact's first line run, generously: 0.6 em each
 * (the face runs about 0.55), at the person's text size.
 */
const lettersWide = (count: number, scale: number) => Math.ceil(count * textStyles.labelSm.fontSize * 0.6 * scale);

function TextPostCardComponent({
  post,
  mine,
  onPress,
  onBeforeRsvp,
}: {
  post: ListedPost;
  /** The reader's own post: it says Hosting, never Join. */
  mine: boolean;
  onPress: () => void;
  /** Asked before a first RSVP; resolve true to go ahead. */
  onBeforeRsvp: () => Promise<boolean>;
}) {
  const theme = useTheme();
  const typeColors = useTypeColors();
  const reduceMotion = useReducedMotion();
  const scale = useFontScale();
  const words = usePostDescription(post.id);

  const pressed = useSharedValue(0);
  const dip = useAnimatedStyle(() => ({
    transform: reduceMotion ? [] : [{ scale: 1 - 0.02 * pressed.value }],
  }));
  const press = {
    onPress,
    onPressIn: () => pressed.set(withTiming(1, { duration: 90 })),
    onPressOut: () => pressed.set(withTiming(0, { duration: 160 })),
  };

  const type = typeColors[post.type];
  const day = formatCardDay(post.startAt);
  const time = formatClock(post.startAt);
  // The place, and the city under it: the first part of "Lagos, Nigeria". Not when the place
  // is the city itself (a post with no venue named).
  const city = post.localityLabel?.split(',')[0]?.trim() || null;
  const place = post.placeName;
  const under = city && place && !place.startsWith(city) ? city : null;
  const heldHeight = Math.round(WORDS_HELD * textStyles.bodySm.lineHeight * scale);

  // What when and where need to sit side by side: the day in full, and the place up to
  // PLACE_LETTERS letters. The line they share with Join wraps by this: with room for it and
  // Join, one line; without, Join goes under. Without room for it even alone, the two stack.
  // (Until the line is measured it is taken as roomy: nearly all are.)
  const [lineWidth, setLineWidth] = useState<number | null>(null);
  const whenNeeds = day ? ICON + ICON_GAP + lettersWide(Math.max(day.length, time?.length ?? 0), scale) : 0;
  const whereNeeds = place
    ? ICON + ICON_GAP + lettersWide(Math.min(Math.max(place.length, under?.length ?? 0), PLACE_LETTERS), scale)
    : 0;
  const factsNeed = whenNeeds + whereNeeds + (day && place ? FACTS_GAP * 2 + 1 : 0);
  const stacked = lineWidth !== null && lineWidth < factsNeed;

  return (
    <Animated.View
      style={[
        {
          borderRadius: 14,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.card,
          padding: 16,
          gap: 12,
        },
        dip,
      ]}
    >
      {/* Two things to press, side by side for a screen reader: the post, and Join. Join is not
          inside the post's own button, where it could not be reached. */}
      <Pressable
        {...press}
        accessibilityRole="button"
        accessibilityLabel={[typeLabels[post.type], post.title, words.text, day, time, place, under]
          .filter(Boolean)
          .join(', ')}
        style={{ gap: 6 }}
      >
        <View
          style={{
            alignSelf: 'flex-start',
            borderRadius: 999,
            paddingHorizontal: 10,
            paddingVertical: 4,
            marginBottom: 4,
            backgroundColor: type.tag,
          }}
        >
          <Text variant="labelXs" style={{ color: type.softLabel }}>
            {typeLabels[post.type]}
          </Text>
        </View>
        <Text variant="headingSm" numberOfLines={2}>
          {post.title}
        </Text>
        {words.text ? (
          <Text variant="bodySm" tone="muted" numberOfLines={WORDS_LINES}>
            {words.text}
          </Text>
        ) : words.loading ? (
          // The words on their way: two bars where the lines will be.
          <View style={{ height: heldHeight, justifyContent: 'space-evenly' }}>
            <SkeletonBlock height={10} radius={5} />
            <SkeletonBlock width="62%" height={10} radius={5} />
          </View>
        ) : null}
      </Pressable>

      <View
        onLayout={(e) => setLineWidth(e.nativeEvent.layout.width)}
        style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 12, rowGap: 12 }}
      >
        {/* When and where. Already read out with the post above, so not a second time here. */}
        <Pressable
          // A new view for a new basis: Yoga works a view's basis out once and keeps it, so one
          // that changed (the text size, the two stacking) would otherwise be laid out by the old.
          key={stacked ? 'stacked' : factsNeed}
          {...press}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          // It grows but is not let shrink, on purpose: Yoga gives a lone child that both grows
          // and shrinks no basis at all (a shortcut that is only right where a row cannot wrap),
          // and the line would then never break. `maxWidth` is what keeps it inside the card.
          style={[
            { flexGrow: 1, flexShrink: 0, maxWidth: '100%', gap: FACTS_GAP },
            stacked
              ? { flexBasis: '100%', flexDirection: 'column', gap: 10 }
              : { flexBasis: factsNeed, flexDirection: 'row', alignItems: 'center' },
          ]}
        >
          {day ? (
            <Fact
              icon={<SvgIcon name="calendar" size={ICON} tint={theme.foreground} />}
              title={day}
              detail={time}
              takes={stacked ? 'line' : 'own'}
            />
          ) : null}
          {day && place && !stacked ? (
            <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: theme.border }} />
          ) : null}
          {place ? (
            <Fact
              icon={<VectorIcon name="pin" size={ICON} color={theme.foreground} />}
              title={place}
              detail={under}
              takes={stacked ? 'line' : 'rest'}
            />
          ) : null}
        </Pressable>
        {/* At the end of the line it is on: beside when and where, or under them. */}
        <View style={{ marginLeft: 'auto' }}>
          <JoinPill
            postId={post.id}
            rsvpState={post.rsvpState}
            privatePost={post.visibility === 'private'}
            mine={mine}
            onBeforeRsvp={onBeforeRsvp}
            labels={exploreCopy.join}
          />
        </View>
      </View>
    </Animated.View>
  );
}

/**
 * One fact about the post: a glyph, a line, and a quieter line under it.
 * `takes` is the room it has: its `own` width (when, beside where), the `rest`
 * of the line (where, cut short when there is not enough), or a `line` to
 * itself (the two stacked).
 */
function Fact({
  icon,
  title,
  detail,
  takes,
}: {
  icon: ReactNode;
  title: string;
  detail: string | null;
  takes: 'own' | 'rest' | 'line';
}) {
  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'center', gap: ICON_GAP },
        takes === 'own' ? { flexShrink: 0 } : takes === 'rest' ? { flex: 1 } : { alignSelf: 'stretch' },
      ]}
    >
      {icon}
      <View style={takes === 'own' ? undefined : { flex: 1 }}>
        <Text variant="labelSm" numberOfLines={1}>
          {title}
        </Text>
        {detail ? (
          <Text variant="bodyXs" tone="muted" numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** Memoised: a long list redraws only the card that changed. */
export const TextPostCard = memo(TextPostCardComponent);
