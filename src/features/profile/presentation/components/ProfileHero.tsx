import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Avatar, Tag, Text, enterRise } from '@shared/components';

import type { Interest } from '../../domain/entities/Profile';
import { profileViewCopy } from '../profileViewCopy';

/**
 * The top of a profile (Figma Own Profile, Other User): the photo beside the
 * counters, then name, pronouns, home city, "Open to meet today" when they
 * said so, tagline, bio and interests. (No "Visiting" city: the API's
 * `visiting` is always null while trips are parked.)
 *
 * Counters: Events and Countries come from the person's attended history; the
 * design's Streak has no data anywhere (API map §12) and is left out. While the
 * history loads the numbers show "–". The row is flex, so the counters share
 * whatever width there is and grow with the text.
 */
export function ProfileHero({
  name,
  avatarUrl,
  pronouns,
  city,
  openToMeetToday = false,
  tagline,
  bio,
  interests,
  counters,
}: {
  name: string;
  avatarUrl: string | null;
  pronouns?: string | null;
  city?: string | null;
  openToMeetToday?: boolean;
  tagline?: string | null;
  bio?: string | null;
  interests: Interest[];
  counters: { events: number; countries: number } | null;
}) {
  return (
    <Animated.View entering={enterRise(0)} style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
        <Avatar name={name} uri={avatarUrl} size={88} />
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <Counter label={profileViewCopy.counters.events} value={counters?.events} />
          <Counter label={profileViewCopy.counters.countries} value={counters?.countries} />
        </View>
      </View>
      <View style={{ gap: 2 }}>
        <Text variant="headingMd" accessibilityRole="header">
          {name}
        </Text>
        {pronouns ? (
          <Text variant="bodySm" tone="muted">
            {pronouns}
          </Text>
        ) : null}
        {city ? (
          <Text variant="bodySm" tone="muted">
            {city}
          </Text>
        ) : null}
        {openToMeetToday ? (
          <View style={{ flexDirection: 'row', marginTop: 6 }}>
            <Tag label={profileViewCopy.openToMeet} tone="success" />
          </View>
        ) : null}
        {tagline ? <Text variant="bodySm">{tagline}</Text> : null}
        {bio ? (
          <Text variant="bodySm" className="mt-4">
            {bio}
          </Text>
        ) : null}
      </View>
      {interests.length ? <InterestPills labels={interests.map((i) => i.name)} /> : null}
    </Animated.View>
  );
}

function Counter({ label, value }: { label: string; value: number | undefined }) {
  return (
    <View
      style={{ flex: 1, alignItems: 'center' }}
      accessible
      accessibilityLabel={value === undefined ? label : `${value} ${label}`}
    >
      <Text variant="headingXl" maxFontSizeMultiplier={1.3}>
        {value === undefined ? '–' : String(value)}
      </Text>
      {/* One line that shrinks rather than breaking "Countries" mid-word at large text. */}
      <Text variant="bodyXs" tone="muted" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {label}
      </Text>
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

/** Pale pills in rows that wrap (interests, languages). Not buttons. */
export function InterestPills({ labels }: { labels: string[] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {labels.map((label, i) => (
        <View
          // Two cities can share a name; the position keeps their keys apart.
          key={`${i}-${label}`}
          className="bg-surface-muted"
          style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}
        >
          <Text variant="bodySm">{label}</Text>
        </View>
      ))}
    </View>
  );
}
