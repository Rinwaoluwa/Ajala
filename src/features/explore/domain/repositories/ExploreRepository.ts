import type {
  Bbox,
  Interest,
  MapPins,
  PlaceResult,
  PostsPage,
  PostPreview,
  PostType,
  ReportReasonCode,
  RsvpResult,
} from '../entities/Explore';

/** What Explore needs from the API and the phone. Implemented in `data/`. */
export interface ExploreRepository {
  /**
   * Pins in a box of the feed's city, of one type or all (API map §7); `titleFilter`
   * keeps those whose title contains it (`q`, up to 80 characters).
   */
  getPins(bbox: Bbox, type: PostType | null, titleFilter: string | null): Promise<MapPins>;
  getPost(postId: string): Promise<PostPreview>;
  rsvp(postId: string): Promise<RsvpResult>;
  /** Counts a click on a post's pay-or-book link, once per person. */
  recordLinkClick(postId: string): Promise<void>;
  report(postId: string, reason: ReportReasonCode, details: string): Promise<void>;
  listInterests(): Promise<Interest[]>;
  /** The feed of one type, in the city the server picks (`GET /feed?type=`). */
  getFeed(type: PostType, cursor: string | null, limit: number): Promise<PostsPage>;
  /** `GET /search/posts`: words, interests or both (never neither), optionally one type. */
  searchPosts(
    search: { words: string | null; interestIds: readonly string[]; type: PostType | null },
    cursor: string | null,
    limit: number,
  ): Promise<PostsPage>;
  searchPlaces(query: string, limit: number): Promise<PlaceResult[]>;
  /** Whether "Before you RSVP" has been acknowledged on this install. */
  hasSeenRsvpNotice(): Promise<boolean>;
  markRsvpNoticeSeen(): Promise<void>;
}
