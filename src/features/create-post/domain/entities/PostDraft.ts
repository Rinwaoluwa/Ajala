import type { PostKind } from '../postKinds';

/**
 * A post being written in the create wizard: everything the steps collect,
 * kept on the phone until Publish or Save draft sends it as one request
 * (API map §5). Values are as the person entered them; `toSubmission` turns
 * them into what the API takes.
 */

export type Currency = 'NGN' | 'USD';

/** A photo picked for the carousel, compressed and ready to upload. */
export type DraftPhoto = { key: string; uri: string; name: string; type: 'image/jpeg' };

export type Coordinates = { lat: number; lng: number };

/**
 * A Google place picked in the wizard: a Plan's destination or a Group's
 * location (a city), or the venue behind a meeting point. The API takes its
 * Google id as `placeId` and looks up the coordinates and address itself
 * (spec §1.6, §2.12), so the id is what matters; the words are for the screen.
 */
export type DraftPlace = {
  /**
   * Null only on a destination read back from a saved draft, where the server
   * no longer says which Google place the city was (`draftFromSaved`). Such a
   * place is shown but never sent: the post already has its place.
   */
  placeId: string | null;
  /** "Lagos", "Terra Kulture". */
  name: string;
  /** The line under the name: "Victoria Island, Lagos, Nigeria". Empty when there is none. */
  address: string;
  coords: Coordinates | null;
};

/** One row of a place search, before it is picked. */
export type PlaceOption = { placeId: string; name: string; detail: string };

/** What a place search looks for: cities (a destination), or any place (a venue). */
export type PlaceSearchKind = 'cities' | 'places';

/** A line of the step-two list: an Event's running order or a Plan's stops. */
export type DraftNote = { key: string; text: string };

/** How often a Group meets again (spec §6 `Recurrence`). */
export type Recurrence = 'weekly' | 'biweekly' | 'monthly';

export type PostDraft = {
  kind: PostKind;
  photos: DraftPhoto[];
  title: string;
  description: string;
  /** Plans and Groups: the city it happens in, picked from a cities search. */
  destination: DraftPlace | null;
  /** The day, at local midnight. */
  date: Date | null;
  /** Times of day; only their hours and minutes count. */
  startTime: Date | null;
  endTime: Date | null;
  /** Meeting point, or an Event's venue, in words: sent as `placeName`. */
  place: string;
  /**
   * The Google place picked for `place` from the search under the field, sent
   * as `placeId`. Cleared whenever `place` is typed over.
   */
  venue: DraftPlace | null;
  /**
   * A pin for `place` when the host typed it rather than picking a suggestion:
   * the phone's geocoder finds it on leaving step two, and it is sent as
   * `lat` + `lng`. Cleared whenever `place` changes.
   */
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
  /**
   * Meetups, Events and Groups: what each person pays, in whole units as typed.
   * Blank is "no price" — the host may skip it, so the post shows no price at all
   * (not "Free"). Plans carry no money, so theirs is never sent.
   */
  price: string;
  currency: Currency;
  /** Meetups, Events and Groups: an optional https link to pay or book. Never sent on a Plan. */
  externalUrl: string;
  interestIds: string[];
};

export function emptyDraft(kind: PostKind): PostDraft {
  return {
    kind,
    photos: [],
    title: '',
    description: '',
    destination: null,
    date: null,
    startTime: null,
    endTime: null,
    place: '',
    venue: null,
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
    price: '',
    currency: 'NGN',
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
  /**
   * Where it happens: a Google place id, or a pin as `lat` + `lng`, never both
   * (spec §2.12). Every type needs one of them to publish.
   */
  placeId?: string;
  lat?: number;
  lng?: number;
  placeName?: string;
  capacity?: number;
  /** A price per person (Meetups, Events, Groups), in the smallest unit, with `currency`. */
  priceCents?: number;
  currency?: Currency;
  /** Meetups, Events and Groups only. */
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
  /** The label under the card; the place's city name when the host gave none. */
  placeName: string | null;
  /** The Google place the post is at; null for a dropped pin or no place yet. */
  placeId: string | null;
  formattedAddress: string | null;
  /** The city and country around the place: "Lagos, Nigeria". */
  localityLabel: string | null;
  lat: number | null;
  lng: number | null;
  capacity: number | null;
  /** Per person, in hundredths of the currency; null when there is no price. */
  priceCents: number | null;
  currency: string | null;
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
