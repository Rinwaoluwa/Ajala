import type { SetupAnswers } from '../../domain/usecases/ProfileSetupUseCases';
import type { MissingBasics } from '../../domain/rules/profileSetupRules';
import type { SetupDraft } from './ProfileSetupContext';

/**
 * What the setup draft sends in its one `PATCH /me`.
 *
 * Built from whatever the draft holds, with nothing required: the save must go
 * out even if every optional step was skipped (or a deep link skipped the
 * steps), because an email sign-up stays incomplete until its first
 * `PATCH /me` (backend answers A1). The phone's time zone always goes with it
 * when known, so the body is never empty.
 *
 * Name and date of birth are sent only when the account lacks them; an email
 * sign-up already gave both.
 */
export function setupAnswers(
  draft: SetupDraft,
  missing: MissingBasics,
  timezone: string | undefined,
): SetupAnswers {
  return {
    homePlaceId: draft.homeCity?.placeId ?? null,
    languages: draft.languages,
    gender: draft.gender,
    travelStyles: draft.travelStyles,
    favouriteDestinationIds: draft.destinations.map((c) => c.placeId),
    fullName: missing.name ? draft.fullName : undefined,
    dateOfBirth: missing.dateOfBirth ? (draft.dateOfBirth ?? undefined) : undefined,
    interestIds: draft.skippedInterests ? undefined : draft.interestIds,
    timezone,
  };
}
