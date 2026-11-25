import { memo } from 'react';
import { TouchableOpacity, View, useWindowDimensions } from 'react-native';

import {
  CardPhotos,
  PostListCard,
  Tag,
  Text,
  formatCardDay,
  formatClock,
  type TagTone,
} from '@shared/components';
import { SCREEN_GUTTER } from '@shared/theme';

import type { TripCard } from '../../domain/entities/Trip';
import { tripsCopy } from '../copy';
import { tripSpan } from '../format';
import { TravellerDots } from './TravellerDots';

/**
 * A trip on the Trips tab, on every list: the card a post is on Home
 * (`PostListCard`, product 25 Nov), so a post looks the same wherever it is
 * listed. Its photos at the head when it has any, the type's tag, the title,
 * the price when it has one, and when and where.
 *
 * What is Trips' own:
 *
 *   - **How I stand with it**, at the top right, level with the type's tag:
 *     Hosting, Going, Request sent, Waitlisted, Completed, or Cancelled on a
 *     post that was called off. There is no Join: every trip here is one I am
 *     already in, waiting on, or hosting.
 *   - **Who is joining and "View trip"** at its foot, where the feed's card has
 *     Comment and the bookmark: up to three faces (`TravellerDots`), "3
 *     joining" ("9 travellers" on one I went to), and the link. The whole foot
 *     opens the trip, as the rest of the card does. A photo opens it too.
 *   - **When**, for a trip over several days or one that repeats: the span
 *     ("18–20 Oct") in the day's place, and how often after the time ("6:00 PM
 *     · Weekly"). A trip of one day is dated as any post is.
 */
function statusTag(trip: TripCard): { label: string; tone: TagTone } {
  if (trip.status === 'cancelled') return { label: tripsCopy.cancelled, tone: 'neutral' };
  return {
    label: tripsCopy.roles[trip.role],
    // Both are still waiting to get in, so both read as pending.
    tone: trip.role === 'requested' || trip.role === 'waitlisted' ? 'pending' : 'success',
  };
}

/** "When" in Trips' words, or nothing for a one-day trip that does not repeat (the card dates those itself). */
function whenOf(trip: TripCard): { day: string; time: string | null } | null {
  const span = tripSpan(trip.startAt, trip.endAt);
  const repeats = trip.recurrence ? tripsCopy.recurrence[trip.recurrence] : null;
  if (!span && !repeats) return null;
  const day = span ?? formatCardDay(trip.startAt);
  if (!day) return null;
  return { day, time: [formatClock(trip.startAt), repeats].filter(Boolean).join(' · ') || null };
}

function TripListCardComponent({ trip, onOpen }: { trip: TripCard; onOpen: () => void }) {
  const { width: screen } = useWindowDimensions();
  const tag = statusTag(trip);
  // Somewhere I went had me in it, whatever the count says.
  const went = trip.role === 'attended';
  const people = went ? tripsCopy.travellers(trip.goingCount) : tripsCopy.joining(trip.goingCount);

  return (
    <PostListCard
      type={trip.type}
      typeLabel={tripsCopy.types[trip.type]}
      title={trip.title}
      price={trip.price}
      startAt={trip.startAt}
      when={whenOf(trip)}
      // A trip with no place of its own names its city.
      placeName={trip.placeName ?? (trip.localityLabel || null)}
      localityLabel={trip.localityLabel || null}
      onPress={onOpen}
      photos={
        trip.images.length > 0 ? (
          <CardPhotos
            images={trip.images}
            // The list is the screen less its margins, and the card its own hairline each side.
            width={screen - SCREEN_GUTTER * 2 - 2}
            onOpen={onOpen}
            label={trip.title}
          />
        ) : null
      }
      corner={
        // The card sets its corner out a little, for a button with room round its mark: put back.
        <View style={{ marginTop: 6, marginRight: 8 }}>
          <Tag label={tag.label} tone={tag.tone} />
        </View>
      }
      footer={
        <TouchableOpacity
          activeOpacity={0.6}
          onPress={onOpen}
          accessibilityRole="button"
          accessibilityLabel={`${people}. ${tripsCopy.viewTrip}`}
          // The link goes under the faces when the two do not fit side by side (large text).
          style={{
            minHeight: 48,
            paddingVertical: 8,
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            columnGap: 10,
            rowGap: 4,
          }}
        >
          <TravellerDots postId={trip.id} count={went ? Math.max(trip.goingCount, 1) : trip.goingCount} />
          <Text variant="labelSm" style={{ flexGrow: 1 }}>
            {people}
          </Text>
          <Text variant="labelSm" tone="link">
            {tripsCopy.viewTrip}
          </Text>
        </TouchableOpacity>
      }
    />
  );
}

/** Memoised: a long list redraws only the card that changed. */
export const TripListCard = memo(TripListCardComponent);
