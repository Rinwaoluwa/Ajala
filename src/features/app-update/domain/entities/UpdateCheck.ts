/**
 * Whether this build may still be used, from `minAppVersion` in `GET /app/config`.
 *
 * `storeUrl` is where the update is; null when it is not known (iOS before the
 * app has an App Store id), in which case the screen says where to go instead.
 */
export type UpdateCheck =
  | { required: false }
  | {
      required: true;
      installedVersion: string;
      minimumVersion: string;
      storeUrl: string | null;
    };
