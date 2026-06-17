/**
 * Generates the last_security_action_at timestamp.
 * This is used to invalidate tokens issued before this timestamp.
 * We subtract 2 seconds to account for clock drift.
 *
 * @returns The timestamp Date.
 */
export function updateSecurityActionTime(): Date {
  return new Date(Date.now() - 2000);
}
