/**
 * Whether Ajala may use the phone's location — required to use the app: the
 * feed, the map and "Current city" all start from it.
 *
 *   - `granted`: while using the app.
 *   - `askable`: the system prompt can still be shown (never asked, or refused
 *     on Android where it may ask again).
 *   - `blocked`: refused for good; only Settings can change it.
 */
export type LocationAccess = 'granted' | 'askable' | 'blocked';

export interface LocationAccessRepository {
  current(): Promise<LocationAccess>;
  /** Shows the system prompt and answers with the result. */
  request(): Promise<LocationAccess>;
  openSettings(): void;
}
