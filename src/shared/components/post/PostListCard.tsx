import { memo, useState, type ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { useFontScale } from '@shared/hooks/useFontScale';
import { useLocalMoney } from '@shared/hooks/useLocalMoney';
import { useTheme } from '@shared/hooks/useTheme';
import { formatMinor } from '@shared/money';
import { textStyles } from '@shared/theme';
import { useTypeColors, type TypeColorKey } from '@shared/theme/postTypeColors';

import { SkeletonBlock } from '../feedback/Skeleton';
import { CARD_PHOTOS_ASPECT } from '../media/CardPhotos';
import { SvgIcon } from '../ui/SvgIcon';
import { Text } from '../ui/Text';
import { VectorIcon } from '../ui/VectorIcon';
import { formatCardDay, formatClock } from './formatPost';

/**
 * A post as a card in a list (Home design, 24 Nov): the home feed's posts and
 * the Explore list's, so a post looks the same wherever it is listed.
 *
 * It is a quick look, not the post (product, 24 Nov): what it is, what it
 * costs, when and where. The host's words are on the post's page, a tap away,
 * and not here.
 *
 * From the top: its photos when it has any (`photos`, a `CardPhotos`), the
 * type's tag in the type's own colour, the title, the price when it has one,
 * then when and where side by side with one action at the end of the line
 * (`action`, Join). A card may close with a row of its own under a hairline
 * (`footer`: the feed's Comment and Save) and carry something at its top
 * right, level with the tag (`corner`: the feed's menu). With no photos it is
 * the same card without its head.
 *
 * The price is the post's own, in its own currency ("₦5,000"). Read somewhere
 * that uses another, about what it comes to there follows it, quieter
 * ("≈ €3"): an estimate beside the real price, never instead of it. A post
 * with no price says nothing: no price is not the same as free (backend
 * answers C1).
 *
 * The whole card opens the post (`onPress`); what is in `photos`, `action`,
 * `corner` and `footer` keeps its own presses. It dips to 98% while pressed.
 *
 * Fitted to a phone's width, which is narrower than the design's frame:
 *   - The day is "Thu 26 Nov"; the year is written only when it is not this
 *     one (`formatCardDay`).
 *   - When keeps its width; where takes what is left and is what is cut short
 *     (one line each, with an ellipsis).
 *   - Where is never cut below eight letters to keep the action beside it:
 *     when there is not that much room (a narrow phone, a long label, larger
 *     text) the action goes under the line, at its end, and where has the
 *     whole width.
 *   - When even that is not room enough (the largest text sizes), when and
 *     where stack, each with a line to itself.
 */

/** A price as the API sends it: in the currency's smallest unit (spec §1.5). */
export type PostListCardPrice = { amountCents: number; currency: string; exponent: number };

export type PostListCardProps = {
  type: Exclude<TypeColorKey, 'all'>;
  /** The type's name, as the screen writes it: "Meetup". */
  typeLabel: string;
  title: string;
  /** What it costs; null when the post has no price. */
  price?: PostListCardPrice | null;
  /** When it starts, as the API sends it; null for a post with no date. */
  startAt: string | null;
  /** The place's name; and the city around it ("Lagos, Nigeria"), of which the first part is written under. */
  placeName: string | null;
  localityLabel: string | null;
  /** Opens the post. */
  onPress: () => void;
  /** At the head of the card: its photos. */
  photos?: ReactNode;
  /** At the end of the when-and-where line. */
  action?: ReactNode;
  /** At the top right, level with the type's tag. */
  corner?: ReactNode;
  /** Under a hairline at the card's foot. */
  footer?: ReactNode;
  /** The card's place among its neighbours (margins). */
  style?: StyleProp<ViewStyle>;
};

/** The corners of the app's list cards (the Explore list's photo cards have the same). */
const RADIUS = 14;
const PADDING = 16;
const ICON = 18;
/** Between a glyph and its lines. */
const ICON_GAP = 8;
/** Either side of the hairline between when and where. */
const FACTS_GAP = 12;
/** Letters of the place there is always room for; its whole name when that is shorter. */
const PLACE_LETTERS = 8;
/** How far the title grows with the text size (`Text`, `headingSm`): the price under it grows no further. */
const TITLE_MAX_SCALE = 1.5;

/**
 * How wide `count` letters of a fact's first line run, generously: 0.6 em each
 * (the face runs about 0.55), at the person's text size.
 */
const lettersWide = (count: number, scale: number) => Math.ceil(count * textStyles.labelXs.fontSize * 0.6 * scale);

function PostListCardComponent({
  type,
  typeLabel,
  title,
  price = null,
  startAt,
  placeName,
  localityLabel,
  onPress,
  photos,
  action,
  corner,
  footer,
  style,
}: PostListCardProps) {
  const theme = useTheme();
  const colors = useTypeColors()[type];
  const reduceMotion = useReducedMotion();
  const scale = useFontScale();
  // Rates are asked for only by a card that has a price to work out.
  const money = useLocalMoney(Boolean(price));
  const cost = price ? formatMinor(price.amountCents, price.currency, price.exponent) : null;
  const costHere = money.equivalent(price);

  const pressed = useSharedValue(0);
  const dip = useAnimatedStyle(() => ({
    transform: reduceMotion ? [] : [{ scale: 1 - 0.02 * pressed.value }],
  }));
  const press = {
    onPress,
    onPressIn: () => pressed.set(withTiming(1, { duration: 90 })),
    onPressOut: () => pressed.set(withTiming(0, { duration: 160 })),
  };

  const day = formatCardDay(startAt);
  const time = formatClock(startAt);
  // The place, and the city under it: the first part of "Lagos, Nigeria". Not when the place
  // is the city itself (a post with no venue named).
  const city = localityLabel?.split(',')[0]?.trim() || null;
  const place = placeName;
  const under = city && place && !place.startsWith(city) ? city : null;

  // What when and where need to sit side by side: the day in full, and the place up to
  // PLACE_LETTERS letters. The line they share with the action wraps by this: with room for it
  // and the action, one line; without, the action goes under. Without room for it even alone,
  // the two stack. (Until the line is measured it is taken as roomy: nearly all are.)
  const [lineWidth, setLineWidth] = useState<number | null>(null);
  const whenNeeds = day ? ICON + ICON_GAP + lettersWide(Math.max(day.length, time?.length ?? 0), scale) : 0;
  const whereNeeds = place
    ? ICON + ICON_GAP + lettersWide(Math.min(Math.max(place.length, under?.length ?? 0), PLACE_LETTERS), scale)
    : 0;
  const factsNeed = whenNeeds + whereNeeds + (day && place ? FACTS_GAP * 2 + 1 : 0);
  const stacked = lineWidth !== null && lineWidth < factsNeed;
  const hasFacts = Boolean(day || place);

  return (
    <Animated.View
      // One native view, never flattened away: a route's zoom link (`Link.AppleZoom`) takes a
      // single native child to grow the post's page from.
      collapsable={false}
      style={[
        {
          borderRadius: RADIUS,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.card,
          // The photos at its head take its corners.
          overflow: 'hidden',
        },
        style,
        dip,
      ]}
    >
      {photos}
      <View style={{ paddingHorizontal: PADDING, paddingTop: PADDING, paddingBottom: footer ? 0 : PADDING, gap: 12 }}>
        {/* What can be pressed is side by side for a screen reader: the post, then its action,
            and the corner and the foot. None is inside the post's own button, where it could
            not be reached. */}
        <View>
          <Pressable
            {...press}
            accessibilityRole="button"
            accessibilityLabel={[typeLabel, title, cost, costHere, day, time, place, under].filter(Boolean).join(', ')}
            style={{ gap: 6 }}
          >
            <View
              style={{
                alignSelf: 'flex-start',
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 4,
                marginBottom: 4,
                backgroundColor: colors.tag,
              }}
            >
              <Text variant="labelXs" style={{ color: colors.softLabel }}>
                {typeLabel}
              </Text>
            </View>
            <Text variant="headingSm" numberOfLines={2}>
              {title}
            </Text>
            {cost ? (
              // The estimate goes under the price when the two do not fit side by side. Neither
              // grows past what the title above may (a small heading stops at half again), or at
              // the largest text sizes the price would be the biggest thing on the card.
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 8 }}>
                <Text variant="labelMd" maxFontSizeMultiplier={TITLE_MAX_SCALE}>
                  {cost}
                </Text>
                {costHere ? (
                  <Text variant="bodySm" tone="muted" maxFontSizeMultiplier={TITLE_MAX_SCALE}>
                    {costHere}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </Pressable>
          {corner ? (
            // Level with the tag, clear of the title under it. Over the button, so it takes its own touch.
            <View style={{ position: 'absolute', top: -6, right: -8 }}>{corner}</View>
          ) : null}
        </View>

        {hasFacts || action ? (
          <View
            onLayout={(e) => setLineWidth(e.nativeEvent.layout.width)}
            style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 12, rowGap: 12 }}
          >
            {/* When and where. Already read out with the post above, so not a second time here. */}
            {hasFacts ? (
              <Pressable
                // A new view for a new basis: Yoga works a view's basis out once and keeps it, so
                // one that changed (the text size, the two stacking) would be laid out by the old.
                key={stacked ? 'stacked' : factsNeed}
                {...press}
                accessible={false}
                importantForAccessibility="no-hide-descendants"
                accessibilityElementsHidden
                // It grows but is not let shrink, on purpose: Yoga gives a lone child that both
                // grows and shrinks no basis at all (a shortcut that is only right where a row
                // cannot wrap), and the line would then never break. `maxWidth` keeps it inside.
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
            ) : null}
            {/* At the end of the line it is on: beside when and where, or under them. */}
            {action ? <View style={{ marginLeft: 'auto' }}>{action}</View> : null}
          </View>
        ) : null}

        {footer ? (
          <View>
            <View style={{ height: 1, backgroundColor: theme.border }} />
            {footer}
          </View>
        ) : null}
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
        <Text variant="labelXs" numberOfLines={1}>
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
export const PostListCard = memo(PostListCardComponent);

/**
 * A list card in outline, for a list that is still loading: laid out as a real
 * one is, so nothing shifts when the posts land. `photo` gives it a head,
 * `footer` a foot. Put it inside a `SkeletonPulse`, which makes the blocks
 * breathe together and says "Loading" once.
 */
export function PostListCardSkeleton({
  photo = false,
  footer = false,
  style,
}: {
  photo?: boolean;
  footer?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          borderRadius: RADIUS,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.card,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {photo ? (
        <View style={{ aspectRatio: CARD_PHOTOS_ASPECT }}>
          <SkeletonBlock width="100%" height="100%" radius={0} />
        </View>
      ) : null}
      <View style={{ paddingHorizontal: PADDING, paddingTop: PADDING, paddingBottom: footer ? 0 : PADDING }}>
        <SkeletonBlock width={64} height={24} radius={12} />
        <View style={{ marginTop: 12 }}>
          <SkeletonBlock width="72%" height={18} radius={6} />
        </View>
        {/* When, where, and the action at the end of their line. */}
        <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <SkeletonBlock width={88} height={32} radius={6} />
          <SkeletonBlock width={88} height={32} radius={6} />
          <View style={{ flex: 1 }} />
          <SkeletonBlock width={62} height={36} radius={18} />
        </View>
        {footer ? (
          <>
            <View style={{ marginTop: 12, height: 1, backgroundColor: theme.border }} />
            <View style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <SkeletonBlock width={96} height={18} radius={6} />
              <SkeletonBlock width={20} height={20} radius={6} />
            </View>
          </>
        ) : null}
      </View>
    </View>
  );
}
