import type { PostKind } from '../postKinds';

/**
 * A post being written in the create wizard: everything the five steps collect,
 * kept on the phone until Publish or Save draft sends it as one request
 * (API map §5). Values are as the person entered them; `toSubmission` turns
 * them into what the API takes.
 */

export type Currency = 'NGN' | 'USD';

/** A photo picked for the carousel, compressed and ready to upload. */
export type DraftPhoto = { key: string; uri: string; name: string; type: 'image/jpeg' };

/** A catalog city: a Plan's destination, a Group's location. */
export type DraftCity = { id: string; name: string; label: string; lat: number; lng: number };

export type Coordinates = { lat: number; lng: number };

/** A line of the step-two list: meetup details, event schedule, itinerary, repeat schedule. */
export type DraftNote = { key: string; text: string };

export type PostDraft = {
  kind: PostKind;
  photos: DraftPhoto[];
  title: string;
  description: string;
  /** Plans and Groups: the city it happens in. */
  city: DraftCity | null;
  /** The day, at local midnight. */
  date: Date | null;
  /** Times of day; only their hours and minutes count. */
  startTime: Date | null;
  endTime: Date | null;
  /** Meeting point, or an Event's venue. */
  place: string;
  /** The pin for `place`, once found. Cleared whenever `place` changes. */
  placeCoords: Coordinates | null;
  notes: DraftNote[];
  /** Null is "no limit". */
  capacity: number | null;
  /** Open: anyone can join while there is room. Private: the host approves each request. */
  visibility: 'open' | 'private';
  showOnMap: boolean;
  waitlist: boolean;
  /** A shared cost (Meetup, Plan, Group) or an entry price (Event). */
  costOn: boolean;
  currency: Currency;
  /** Whole units as typed: the total to split, or an Event's price per person. */
  amount: string;
  /** Who the total is split between (not capacity). */
  expected: string;
  externalUrl: string;
  interestIds: string[];
};

export function emptyDraft(kind: PostKind): PostDraft {
  return {
    kind,
    photos: [],
    title: '',
    description: '',
    city: null,
    date: null,
    startTime: null,
    endTime: null,
    place: '',
    placeCoords: null,
    notes: [
      { key: 'note-1', text: '' },
      { key: 'note-2', text: '' },
    ],
    // Events are for more than 100 or no limit (spec §2.12), so they start unlimited.
    capacity: kind === 'event' ? null : 10,
    visibility: 'private',
    showOnMap: true,
    waitlist: false,
    costOn: false,
    currency: 'NGN',
    amount: '',
    expected: '4',
    externalUrl: '',
    interestIds: [],
  };
}

/** What the API is sent (`CreatePostDto`, spec §6), in the domain's words. */
export type PostSubmission = {
  type: PostKind;
  title: string;
  description?: string;
  /** ISO 8601 with the phone's offset. */
  startAt?: string;
  lat?: number;
  lng?: number;
  placeName?: string;
  capacity?: number;
  priceCents?: number;
  currency?: Currency;
  externalUrl?: string;
  waitlistEnabled: boolean;
  visibility: 'open' | 'private';
  showOnMap: boolean;
  interestIds: string[];
  /** Plans only. */
  checklist?: string[];
  photos: DraftPhoto[];
};

/** An interest a post can be tagged with (`GET /interests`). */
export type Interest = { id: string; name: string; emoji: string | null };

/** A post already saved on the server (`GET /posts/:id`), to carry on editing. */
export type SavedPost = {
  id: string;
  type: PostKind;
  title: string;
  description: string;
  startAt: string | null;
  placeName: string | null;
  lat: number | null;
  lng: number | null;
  city: { id: string; name: string; label: string } | null;
  capacity: number | null;
  /** Per person, in the smallest unit; null when free. */
  priceCents: number | null;
  currency: string | null;
  externalUrl: string | null;
  waitlistEnabled: boolean;
  visibility: 'open' | 'private';
  showOnMap: boolean;
  interestIds: string[];
  checklist: string[];
  /** The carousel in order, largest size. */
  imageUrls: string[];
};
