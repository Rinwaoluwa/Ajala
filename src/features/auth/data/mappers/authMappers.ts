import type { Account } from '../../domain/entities/Account';
import type { AuthSession } from '../../domain/entities/AuthSession';
import type { SignUpDetails } from '../../domain/entities/SignUpDetails';
import type { MeDto, SessionDto, SignUpEmailRequestDto, VerifiedSessionDto } from '../dto/authDtos';

/**
 * DTO ↔ entity. The only place the API's vocabulary meets the app's.
 */

export function toSignUpRequest(
  details: SignUpDetails,
  extras: { timezone?: string } = {},
): SignUpEmailRequestDto {
  const { firstName, lastName } = splitFullName(details.fullName);
  return {
    email: details.email,
    password: details.password,
    firstName,
    lastName,
    dob: details.dateOfBirth,
    ...(extras.timezone ? { timezone: extras.timezone } : null),
  };
}

/**
 * The design asks for one "Full Name" field; the API wants the parts separately.
 *
 * Split on the FIRST space, as the screen-to-API map specifies: the first word is
 * the first name and everything after it the last ("Mary Jane Watson" →
 * "Mary" / "Jane Watson"). A single word goes in `firstName` with an empty
 * `lastName`, which the API refuses — the form asks for both words before it
 * gets this far.
 *
 * FLAGGED: splitting names by whitespace is wrong for plenty of people. The real
 * fix is two fields on the form, matching the API — an open design question.
 */
export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { firstName: parts[0] ?? '', lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

export function toAuthSession(dto: SessionDto): AuthSession {
  return {
    accessToken: dto.accessToken,
    refreshToken: dto.refreshToken,
    accessExpiresAt: dto.accessExpiresAt,
    sessionId: dto.sessionId,
    userId: null,
    isNew: false,
  };
}

export function toVerifiedAuthSession(dto: VerifiedSessionDto): AuthSession {
  return {
    ...toAuthSession(dto),
    userId: dto.user?.id ?? null,
    isNew: Boolean(dto.isNew),
  };
}

export function toAccount(dto: MeDto): Account {
  return {
    id: dto.id,
    email: dto.email ?? null,
    firstName: dto.firstName ?? null,
    lastName: dto.lastName ?? null,
    profileCompletedAt: dto.profileCompletedAt ?? null,
    // Absent would be a contract break; treat it as up to date rather than
    // trapping everyone on a terms screen the API never asked for.
    termsUpToDate: dto.termsUpToDate !== false,
  };
}
