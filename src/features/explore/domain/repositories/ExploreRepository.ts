import type {
  Bbox,
  Interest,
  MapPins,
  Me,
  PeoplePage,
  PlaceLocation,
  PlaceResult,
  PostsPage,
  PostPreview,
  PostPrice,
  PostType,
  ReportReasonCode,
  RsvpResult,
} from '../entities/Explore';

/** What Explore needs from the API and the phone. Implemented in `data/`. */
export interface ExploreRepository {
  /**
   * Pins in a box, of one type or all (API map §7); `titleFilter` keeps those
   * whose title contains it (`q`, up to 80 characters). The answer's `reach`
   * says whether the whole box counts or only 30 km round the origin.
   */
  getPins(bbox: Bbox, type: PostType | null, titleFilter: string | null): Promise<MapPins>;
  /**
   * Pins of posts with one interest, of one type or all. `GET /map/pins` has no
   * interest filter, so these come from the post search, which looks within
   * 30 km of the origin whatever box the map shows (`reach: 'radius'`).
   */
  getPinsByInterest(interestId: string, type: PostType | null): Promise<MapPins>;
  getPost(postId: string): Promise<PostPreview>;
  rsvp(postId: string): Promise<RsvpResult>;
  /** Counts a click on a post's link for its host, once per person. */
  recordLinkClick(postId: string): Promise<void>;
  /** The signed-in person: their id (to tell their own posts apart) and their interests. */
  getMe(): Promise<Me>;
  report(postId: string, reason: ReportReasonCode, details: string): Promise<void>;
  listInterests(): Promise<Interest[]>;
  /** The feed of one type, around where the server looks (`GET /feed?type=`). */
  getFeed(type: PostType, cursor: string | null, limit: number): Promise<PostsPage>;
  /**
   * Each post's price by id (null when free), for the map's price filter: pins
   * carry no price. Read from the feed, which holds every live post within
   * 30 km of where it looks, the same posts a free reader's pins show.
   */
  getPrices(type: PostType | null): Promise<Record<string, PostPrice | null>>;
  /** `GET /search/posts`: words, interests or both (never neither), optionally one type. */
  searchPosts(
    search: { words: string | null; interestIds: readonly string[]; type: PostType | null },
    cursor: string | null,
    limit: number,
  ): Promise<PostsPage>;
  /** `GET /search/people`: travellers by first name or handle. Not tied to where the feed looks. */
  searchPeople(words: string, cursor: string | null, limit: number): Promise<PeoplePage>;
  /** Cities matching what was typed, from the place search on the phone; `signal` cancels an overtaken one. */
  searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceResult[]>;
  /** Where a suggested place is (a Place Details lookup, which ends the search session). */
  placeLocation(placeId: string, signal?: AbortSignal): Promise<PlaceLocation>;
  /** Ends the search session when the search is cleared without choosing. */
  endPlaceSearch(): void;
  /** Whether "Before you RSVP" has been acknowledged on this install. */
  hasSeenRsvpNotice(): Promise<boolean>;
  markRsvpNoticeSeen(): Promise<void>;
}
