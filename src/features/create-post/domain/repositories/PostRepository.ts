import type {
  Coordinates,
  DraftCity,
  DraftPhoto,
  Interest,
  PostSubmission,
  SavedPost,
} from '../entities/PostDraft';

/**
 * What the create wizard needs from the API (API map §5). Implemented over HTTP
 * in `data/`; every method throws `CreatePostError`.
 */
export interface PostRepository {
  /** `GET /posts/:id`: a saved draft, to carry on editing. */
  getPost(postId: string): Promise<SavedPost>;
  /** `POST /posts` (multipart): the whole post in one request. Returns its id. */
  create(submission: PostSubmission, status: 'draft' | 'published'): Promise<string>;
  /** `PATCH /posts/:id` (JSON): every field but type, status and photos. */
  update(postId: string, submission: PostSubmission): Promise<void>;
  /** `PUT /posts/:id/images`: the whole carousel, in order. */
  replaceImages(postId: string, photos: DraftPhoto[]): Promise<void>;
  /** `POST /posts/:id/publish`: a saved draft goes live. */
  publish(postId: string): Promise<void>;
  /** `GET /interests`, in the server's order. */
  listInterests(): Promise<Interest[]>;
  /** `GET /cities?q=`: catalog cities, closest match first. */
  searchCities(query: string, limit: number): Promise<DraftCity[]>;
}

/** Finds a typed place on the map (the phone's geocoder). Null when it cannot. */
export interface PlaceLocator {
  locate(text: string): Promise<Coordinates | null>;
}
