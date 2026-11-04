import type {
  Bbox,
  Interest,
  MapPins,
  MeetupsPage,
  PlaceResult,
  PostPreview,
  PostType,
  ReportReasonCode,
  RsvpResult,
} from '../entities/Explore';

/** What Explore needs from the API and the phone. Implemented in `data/`. */
export interface ExploreRepository {
  /** Pins in a box of the feed's city, of one type or all (API map §7). */
  getPins(bbox: Bbox, type: PostType | null): Promise<MapPins>;
  getPost(postId: string): Promise<PostPreview>;
  rsvp(postId: string): Promise<RsvpResult>;
  /** Counts a click on a post's pay-or-book link, once per person. */
  recordLinkClick(postId: string): Promise<void>;
  report(postId: string, reason: ReportReasonCode, details: string): Promise<void>;
  listInterests(): Promise<Interest[]>;
  getMeetups(interestId: string | null, cursor: string | null, limit: number): Promise<MeetupsPage>;
  searchPlaces(query: string, limit: number): Promise<PlaceResult[]>;
  /** Whether "Before you RSVP" has been acknowledged on this install. */
  hasSeenRsvpNotice(): Promise<boolean>;
  markRsvpNoticeSeen(): Promise<void>;
}
