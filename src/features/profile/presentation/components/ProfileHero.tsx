import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Avatar, Text, enterRise } from '@shared/components';

import type { Interest } from '../../domain/entities/Profile';
import { profileViewCopy } from '../profileViewCopy';

/**
 * The top of a profile (Figma Own Profile, Other User): the photo beside the
 * counters, then name, pronouns, home city, tagline, bio and interests.
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
  tagline,
  bio,
  interests,
  counters,
}: {
  name: string;
  avatarUrl: string | null;
  pronouns?: string | null;
  city?: string | null;
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

/** Pale pills in rows that wrap (interests, languages). Not buttons. */
export function InterestPills({ labels }: { labels: string[] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {labels.map((label) => (
        <View
          key={label}
          className="bg-surface-muted"
          style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}
        >
          <Text variant="bodySm">{label}</Text>
        </View>
      ))}
    </View>
  );
}
