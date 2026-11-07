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

/**
 * A catalog city (`GET /cities`): a Plan's destination, a Group's location. Sent
 * as `cityId` when the post has no pin, so only its id and its words are kept.
 */
export type DraftCity = { id: string; name: string; label: string };

export type Coordinates = { lat: number; lng: number };

/** A line of the step-two list: an Event's running order or a Plan's stops. */
export type DraftNote = { key: string; text: string };

/** How often a Group meets again (spec §6 `Recurrence`). */
export type Recurrence = 'weekly' | 'biweekly' | 'monthly';

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
  /**
   * An Event's schedule or a Plan's itinerary, in order. Meetups and Groups have
   * no list in the API, so the wizard does not show one for them.
   */
  notes: DraftNote[];
  /** Groups only: how often it meets again; null when it meets once. */
  recurrence: Recurrence | null;
  /** Groups only: the last day it repeats, at local midnight; null for "until stopped". */
  recurrenceEndsOn: Date | null;
  /** Null is "no limit". */
  capacity: number | null;
  /** Open: anyone can join while there is room. Private: the host approves each request. */
  visibility: 'open' | 'private';
  showOnMap: boolean;
  waitlist: boolean;
  /** A shared cost (Plan, Group) or a price per person (Meetup, Event). */
  costOn: boolean;
  currency: Currency;
  /** Whole units as typed: a Plan's or Group's total to split, or a price per person. */
  amount: string;
  /** Plans and Groups: who the total is split between (not capacity). */
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
    recurrence: null,
    recurrenceEndsOn: null,
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
  /** Same form as `startAt`, and after it. */
  endAt?: string;
  /** Plans and Groups without a pin: the city it happens in. A pin decides the city otherwise. */
  cityId?: string;
  lat?: number;
  lng?: number;
  placeName?: string;
  capacity?: number;
  /** A price per person (Meetups and Events), in the smallest unit, with `currency`. */
  priceCents?: number;
  currency?: Currency;
  /**
   * A shared cost (Plans and Groups): the total in the smallest unit, its
   * currency and how many it is split between — all three or none. The server
   * works out each person's share.
   */
  cost?: { totalCents: number; currency: Currency; expectedCount: number };
  externalUrl?: string;
  waitlistEnabled: boolean;
  visibility: 'open' | 'private';
  showOnMap: boolean;
  interestIds: string[];
  /** Events only: the running order. */
  schedule?: string[];
  /** Plans only: the stops, in order. */
  itinerary?: string[];
  /** Groups only. */
  recurrence?: { frequency: Recurrence; /** YYYY-MM-DD */ endsOn?: string };
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
  endAt: string | null;
  placeName: string | null;
  lat: number | null;
  lng: number | null;
  city: { id: string; name: string; label: string } | null;
  capacity: number | null;
  /** Per person, in hundredths of the currency; null when free. */
  priceCents: number | null;
  currency: string | null;
  /** A Plan's or Group's shared cost, the total in hundredths; null when there is none. */
  costSplit: { totalCents: number; currency: string; expectedCount: number } | null;
  externalUrl: string | null;
  waitlistEnabled: boolean;
  visibility: 'open' | 'private';
  showOnMap: boolean;
  interestIds: string[];
  /** An Event's running order; empty for other types. */
  schedule: string[];
  /** A Plan's stops; empty for other types. */
  itinerary: string[];
  recurrence: { frequency: Recurrence; /** YYYY-MM-DD */ endsOn: string | null } | null;
  /** The carousel in order, largest size. */
  imageUrls: string[];
};
