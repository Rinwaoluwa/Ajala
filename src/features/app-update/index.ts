/**
 * Public API of the `app-update` feature: the forced update when this build is
 * older than `minAppVersion` from `GET /app/config` (spec §2.1), and
 * over-the-air updates with "Updating Ajala" while one installs.
 */

export { ForceUpdateGate } from './presentation/components/ForceUpdateGate';
export { OtaUpdateGate } from './presentation/components/OtaUpdateGate';
