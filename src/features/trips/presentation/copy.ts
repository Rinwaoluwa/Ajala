import type { TripRecurrence, TripRole, TripType, TripsTab } from '../domain/entities/Trip';
import type { TripsErrorCode } from '../domain/entities/TripsError';

/** The Trips tab's words, from the Figma frames (light and dark). */
export const tripsCopy = {
  title: 'Your trips',
  lines: {
    upcoming: 'Good company for wherever you’re headed.',
    requests: 'Activities you’re waiting to get into: requests and waitlists.',
    past: 'A look back at the places and activities you joined.',
  } satisfies Record<TripsTab, string>,
  tabs: [
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'requests', label: 'Requests' },
    { value: 'past', label: 'Past' },
  ] as const,
  types: {
    meetup: 'Meetup',
    event: 'Event',
    plan: 'Plan',
    group: 'Group',
  } satisfies Record<TripType, string>,
  /** The status tag on each card, by how I relate to the post. */
  roles: {
    hosting: 'Hosting',
    going: 'Going',
    requested: 'Request sent',
    waitlisted: 'Waitlisted',
    attended: 'Completed',
  } satisfies Record<TripRole, string>,
  cancelled: 'Cancelled',
  completed: 'Completed',
  recurrence: {
    weekly: 'Weekly',
    biweekly: 'Every two weeks',
    monthly: 'Monthly',
  } satisfies Record<TripRecurrence, string>,
  starts: (time: string) => `Starts ${time}`,
  joining: (n: number) => (n === 0 ? 'No one has joined yet' : `${n} joining`),
  travellers: (n: number) => `${n} traveller${n === 1 ? '' : 's'}`,
  viewTrip: 'View trip ›',
  empty: {
    upcoming: {
      title: 'No plans yet. Where to next?',
      body: 'Explore nearby meetups, events and plans, or create one of your own.',
      action: 'Explore activities',
    },
    requests: {
      title: 'Nothing waiting',
      body: 'When you ask to join a private activity, or join the waitlist for a full one, it shows here until you’re in.',
    },
    past: {
      title: 'Nothing here yet',
      body: 'Activities you’ve been to will show here.',
    },
  },
  notes: {
    waiting: {
      title: 'Still waiting?',
      body: 'You’ll see an update here when a host answers your request or a place opens up on a waitlist.',
    },
    passport: {
      title: 'AJALA passport',
      body: 'Completed trips and activities can add a stamp to your passport.',
    },
  },
  failed: {
    title: 'Your trips didn’t load',
    retry: 'Try again',
  },
  loadingMore: 'Loading more',
};

export const tripsErrors: Record<TripsErrorCode, string> = {
  network: 'You seem to be offline. Check your connection and try again.',
  sessionExpired: 'Your session ended. Sign in again to continue.',
  unknown: 'Something went wrong on our side. Try again.',
};
