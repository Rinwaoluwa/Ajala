import { memo } from 'react';
import { TouchableOpacity, View, useColorScheme } from 'react-native';

import { Tag, Text } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';

import type { TripCard } from '../../domain/entities/Trip';
import { tripsCopy } from '../copy';
import { tripDay } from '../format';
import { TravellerDots } from './TravellerDots';

/**
 * Somewhere I went (Figma Trips / Past): a compact card without a photo — the
 * type and "Completed" tags, the title, "5 Oct · Completed", the place, and how
 * many travellers went. Tapping it opens the post.
 */
function PastTripCardComponent({ trip, onOpen }: { trip: TripCard; onOpen: () => void }) {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const when = [tripDay(trip.startAt), tripsCopy.completed].filter(Boolean).join(' · ');

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={[
        tripsCopy.types[trip.type],
        trip.title,
        when,
        trip.placeName,
        tripsCopy.travellers(trip.goingCount),
      ]
        .filter(Boolean)
        .join(', ')}
      style={{
        borderRadius: 20,
        borderWidth: dark ? 0 : 1,
        borderColor: theme.border,
        backgroundColor: theme.card,
        padding: 18,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        <Tag label={tripsCopy.types[trip.type]} tone="outline" />
        <Tag label={tripsCopy.completed} tone="success" />
      </View>
      <Text variant="headingSm" numberOfLines={2}>
        {trip.title}
      </Text>
      <Text variant="bodySm" tone="muted">
        {when}
      </Text>
      {trip.placeName || trip.cityLabel ? (
        <Text variant="bodySm" tone="muted">
          {trip.placeName ?? trip.cityLabel}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 4 }}>
        <TravellerDots count={Math.max(trip.goingCount, 1)} />
        <Text variant="bodySm" tone="muted">
          {tripsCopy.travellers(trip.goingCount)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export const PastTripCard = memo(PastTripCardComponent);
