import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Avatar, JellyPress, PillRows, SvgIcon, Text, VectorIcon, enterRise } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';

import type { Interest } from '../../domain/entities/Profile';
import { profileViewCopy } from '../profileViewCopy';

/**
 * The top of a profile (Figma Own Profile "Maya Chen", Other User "James
 * Allen"): the photo, with a thin grey edge, beside the name, @handle (and pronouns), home city and "Open to meet"
 * when they said so; then Meetups · Countries · Streak, each with its icon,
 * between hairlines; then the interests as pale pills with their emoji.
 *
 * The counters come from the attended history (`achievementRules`), so they
 * show "–" until it loads. The bio is the screen's to place — under the
 * interests on someone else's profile, under Edit profile on your own.
 */
export function ProfileHero({
  name,
  handle,
  pronouns,
  avatarUrl,
  city,
  openToMeetToday = false,
  interests,
  counters,
}: {
  name: string;
  handle?: string | null;
  pronouns?: string | null;
  avatarUrl: string | null;
  city?: string | null;
  openToMeetToday?: boolean;
  interests: Interest[];
  counters: { events: number; countries: number; streak: number } | null;
}) {
  const theme = useTheme();
  const copy = profileViewCopy;
  return (
    <Animated.View entering={enterRise(0)} style={{ gap: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
        <Avatar name={name} uri={avatarUrl} size={104} outline />
        <View style={{ flex: 1, gap: 4, alignItems: 'flex-start' }}>
          <Text variant="headingLg" accessibilityRole="header">
            {name}
          </Text>
          {handle || pronouns ? (
            <Text variant="bodySm" tone="muted" numberOfLines={1}>
              {[handle ? `@${handle}` : null, pronouns].filter(Boolean).join(' · ')}
            </Text>
          ) : null}
          {city ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <VectorIcon name="pin" size={16} color={theme.muted} />
              <Text variant="bodySm" style={{ flexShrink: 1 }}>
                {city}
              </Text>
            </View>
          ) : null}
          {openToMeetToday ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                marginTop: 2,
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 999,
                backgroundColor: theme.successSoft,
              }}
            >
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.success }} />
              <Text variant="bodyXs" tone="success">
                {copy.openToMeet}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Counter
          icon={<SvgIcon name="users" size={20} tint={theme.primary} />}
          label={copy.counters.events}
          value={counters ? String(counters.events) : undefined}
        />
        <Divider />
        <Counter
          icon={<SvgIcon name="countries" size={20} tint={theme.primary} />}
          label={copy.counters.countries}
          value={counters ? String(counters.countries) : undefined}
        />
        <Divider />
        <Counter
          icon={<SvgIcon name="streak" size={17} height={20} tint={theme.primary} />}
          label={copy.counters.streak}
          value={counters ? copy.counters.streakValue(counters.streak) : undefined}
          spoken={counters ? copy.counters.streakSpoken(counters.streak) : undefined}
        />
      </View>

      {interests.length ? (
        <InterestPills labels={interests.map((i) => i.name)} emojis={interests.map((i) => i.emoji)} jelly />
      ) : null}
    </Animated.View>
  );
}

function Divider() {
  const theme = useTheme();
  return <View style={{ width: 1, alignSelf: 'stretch', marginVertical: 4, backgroundColor: theme.border }} />;
}

/** One counter: its icon, then the number over its name. Shares the row's width with the others. */
function Counter({
  icon,
  label,
  value,
  spoken,
}: {
  icon: ReactNode;
  label: string;
  value: string | undefined;
  spoken?: string;
}) {
  return (
    <View
      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
      accessible
      accessibilityLabel={value === undefined ? label : (spoken ?? `${value} ${label}`)}
    >
      {icon}
      <View style={{ flexShrink: 1 }}>
        <Text variant="headingMd" maxFontSizeMultiplier={1.3} numberOfLines={1}>
          {value ?? '–'}
        </Text>
        {/* One line that shrinks rather than breaking "Countries" mid-word at large text. */}
        <Text variant="bodyXs" tone="muted" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {label}
        </Text>
      </View>
    </View>
  );
}

/** A small heading over a row of pills (travel style, favourite places); nothing when empty. */
export function PillSection({ title, labels }: { title: string; labels: string[] }) {
  if (!labels.length) return null;
  return (
    <View style={{ gap: 10 }}>
      <Text variant="bodySm" tone="muted">
        {title}
      </Text>
      <InterestPills labels={labels} />
    </View>
  );
}

/**
 * Pale pills in rows that wrap (interests, languages, places), each with its
 * emoji when it has one. Not buttons. One line while they fit, otherwise
 * three rows that scroll sideways (`PillRows`), so a long list does not take
 * over the page. `fill` sets the pill colour for pills on a panel.
 *
 * `jelly`: each pill wobbles when touched (`JellyPress`), for the feel of it
 * only. A tap goes nowhere, and screen readers still read them as plain text.
 */
export function InterestPills({
  labels,
  emojis,
  fill,
  small = false,
  jelly = false,
}: {
  labels: string[];
  emojis?: (string | null)[];
  fill?: string;
  small?: boolean;
  jelly?: boolean;
}) {
  const theme = useTheme();
  const pill = (label: string, i: number) => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: 999,
        // The design's sizes: 26pt pills on a profile, 20pt ones inside Travel details.
        paddingHorizontal: small ? 8 : 12,
        paddingVertical: small ? 2 : 3,
        backgroundColor: fill ?? theme.panel,
      }}
    >
      {emojis?.[i] ? <Text variant={small ? 'bodyXs' : 'bodySm'}>{emojis[i]}</Text> : null}
      <Text variant={small ? 'bodyXs' : 'bodySm'}>{label}</Text>
    </View>
  );
  return (
    <PillRows
      maxRows={3}
      // Two cities can share a name; the position keeps their keys apart.
      pills={labels.map((label, i) =>
        jelly ? (
          // No onPress: the wobble is the whole response. Not a button to screen readers.
          <JellyPress key={`${i}-${label}`} accessible={false}>
            {pill(label, i)}
          </JellyPress>
        ) : (
          <View key={`${i}-${label}`}>{pill(label, i)}</View>
        ),
      )}
    />
  );
}
