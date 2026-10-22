import { PlaceholderScreen } from '@shared/components';

/** PLACEHOLDER — Trips (API map §8) needs `GET /me/rsvps`, which the backend does not have yet (§12). */
export default function TripsRoute() {
  return <PlaceholderScreen title="Trips" body="Your upcoming plans and requests will appear here." />;
}
