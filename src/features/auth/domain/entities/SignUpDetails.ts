/**
 * What a person gives us to create an account with email (FRD MOB-001).
 */
export type SignUpDetails = {
  email: string;
  fullName: string;
  /**
   * A calendar date, `YYYY-MM-DD`. A birth date has no time of day and no zone;
   * storing it as a `Date` would shift it by a day for anyone west of UTC.
   */
  dateOfBirth: string;
  password: string;
};
