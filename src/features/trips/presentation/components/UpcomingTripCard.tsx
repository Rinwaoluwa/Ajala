import { Image } from 'expo-image';
import { memo } from 'react';
import { TouchableOpacity, View } from 'react-native';

import { Tag, Text, type TagTone } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';
import { useAppColorScheme } from '@shared/hooks/useAppColorScheme';
import { useTypeColors } from '@shared/theme/postTypeColors';

import type { TripCard } from '../../domain/entities/Trip';
import { tripsCopy } from '../copy';
import { tripDates, tripTime } from '../format';
import { TravellerDots } from './TravellerDots';

/**
 * A trip still to come (Figma Trips / Upcoming and Requests): the cover photo,
 * the type and status tags (Hosting, Going, Request sent, Waitlisted, or
 * Cancelled on a post I called off), the city and country in caps (`localityLabel`),
 * the title, "18–20 Oct · Starts 10:00" (plus how often a Group repeats), the
 * place, who is joining, and "View trip ›".
 * Light: white with a hairline and a grey place line. Dark: Deep, with the
 * place and the link in Marigold.
 *
 * The whole card opens the trip. Rows wrap at large text sizes rather than clip.
 *
 * A trip with no photo (photos are optional) has no cover at all: the tags, the
 * title and the details make the card, as a post of words is set on a profile.
 * The type's colour filling a cover's space read as a photo that never loaded.
 */
function statusTag(trip: TripCard): { label: string; tone: TagTone } {
  if (trip.status === 'cancelled') return { label: tripsCopy.cancelled, tone: 'neutral' };
  return {
    label: tripsCopy.roles[trip.role],
    // Both are still waiting to get in, so both read as pending.
    tone: trip.role === 'requested' || trip.role === 'waitlisted' ? 'pending' : 'success',
  };
}

function UpcomingTripCardComponent({ trip, onOpen }: { trip: TripCard; onOpen: () => void }) {
  const theme = useTheme();
  const typeColors = useTypeColors();
  const dark = useAppColorScheme() === 'dark';
  const dates = tripDates(trip.startAt, trip.endAt);
  const time = tripTime(trip.startAt);
  const when = [
    dates,
    time ? tripsCopy.starts(time) : null,
    trip.recurrence ? tripsCopy.recurrence[trip.recurrence] : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const tag = statusTag(trip);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={[
        tripsCopy.types[trip.type],
        tag.label,
        trip.title,
        when,
        trip.placeName,
        tripsCopy.joining(trip.goingCount),
      ]
        .filter(Boolean)
        .join(', ')}
      style={{
        borderRadius: 20,
        borderWidth: dark ? 0 : 1,
        borderColor: theme.border,
        backgroundColor: theme.card,
        overflow: 'hidden',
      }}
    >
      {trip.imageUrl ? (
        <View style={{ aspectRatio: 2, backgroundColor: theme.skeleton }}>
          <Image source={{ uri: trip.imageUrl }} style={{ flex: 1 }} contentFit="cover" transition={250} />
        </View>
      ) : null}
      <View style={{ padding: 18, gap: 6 }}>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 6,
            marginBottom: 4,
          }}
        >
          {trip.imageUrl ? (
            <Tag label={tripsCopy.types[trip.type]} tone="outline" />
          ) : (
            // No cover to say what kind of post it is: the type in its own colour, as on a profile.
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 3,
                borderRadius: 999,
                backgroundColor: typeColors[trip.type].soft,
                justifyContent: 'center',
              }}
            >
              <Text variant="labelSm" style={{ color: typeColors[trip.type].softLabel }}>
                {tripsCopy.types[trip.type]}
              </Text>
            </View>
          )}
          <Tag label={tag.label} tone={tag.tone} />
        </View>
        {trip.localityLabel ? (
          <Text variant="labelXs" tone="muted" style={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
            {trip.localityLabel}
          </Text>
        ) : null}
        <Text variant="headingMd" numberOfLines={2}>
          {trip.title}
        </Text>
        {when ? <Text variant="bodyMd">{when}</Text> : null}
        {trip.placeName ? (
          <Text variant="bodySm" style={{ color: dark ? theme.accent : theme.muted }}>
            {trip.placeName}
          </Text>
        ) : null}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 10,
            marginTop: 8,
          }}
        >
          <TravellerDots count={trip.goingCount} />
          <Text variant="bodySm" style={{ flexGrow: 1 }}>
            {tripsCopy.joining(trip.goingCount)}
          </Text>
          <Text variant="labelMd" tone="link">
            {tripsCopy.viewTrip}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

/** Memoised: a long list re-renders only the card that changed. */
export const UpcomingTripCard = memo(UpcomingTripCardComponent);
