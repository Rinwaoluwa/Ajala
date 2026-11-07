import type {
  CityDto,
  CreatePostFieldsDto,
  InterestDto,
  PostDetailDto,
  SavedPostDto,
  UpdatePostDto,
  UploadFile,
} from '../../dto/postDtos';

/** The API's version prefix, as every other client in the app writes it. */
const V1 = '/api/v1';

/**
 * The create wizard's endpoints as the signed-in person (spec §2.12, §3.6; API
 * map §5). `request` is auth's `AuthorizedRequest`.
 */
export type PostRequest = <T>(request: {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT';
  path: string;
  body?: unknown;
}) => Promise<T>;

const query = (params: Record<string, string | number>) =>
  Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');

/**
 * The multipart form (spec §2.12): lists (`interestIds`, `schedule`,
 * `itinerary`) as one field per value, booleans as the text "true"/"false",
 * photos as repeated `images` in carousel order.
 */
export function toPostForm(fields: CreatePostFieldsDto, images: UploadFile[]): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) value.forEach((v) => form.append(key, String(v)));
    else form.append(key, String(value));
  }
  // React Native's FormData takes a file as { uri, name, type }.
  images.forEach((image) => form.append('images', image as unknown as Blob));
  return form;
}

export function createPostApi(request: PostRequest) {
  return {
    getPost: (postId: string) =>
      request<SavedPostDto>({ method: 'GET', path: `${V1}/posts/${encodeURIComponent(postId)}` }),

    create: (fields: CreatePostFieldsDto, images: UploadFile[]) =>
      request<PostDetailDto>({ method: 'POST', path: `${V1}/posts`, body: toPostForm(fields, images) }),

    update: (postId: string, body: UpdatePostDto) =>
      request<PostDetailDto>({ method: 'PATCH', path: `${V1}/posts/${encodeURIComponent(postId)}`, body }),

    replaceImages: (postId: string, images: UploadFile[]) => {
      const form = new FormData();
      images.forEach((image) => form.append('images', image as unknown as Blob));
      return request<PostDetailDto>({
        method: 'PUT',
        path: `${V1}/posts/${encodeURIComponent(postId)}/images`,
        body: form,
      });
    },

    publish: (postId: string) =>
      request<PostDetailDto>({ method: 'POST', path: `${V1}/posts/${encodeURIComponent(postId)}/publish` }),

    listInterests: () => request<InterestDto[]>({ method: 'GET', path: `${V1}/interests` }),

    searchCities: (q: string, limit: number) =>
      request<CityDto[]>({ method: 'GET', path: `${V1}/cities?${query({ q, limit })}` }),
  };
}

export type PostApi = ReturnType<typeof createPostApi>;
