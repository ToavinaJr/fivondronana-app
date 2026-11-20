/**
 * Controls whether account creation/email-change flows send credentials by email.
 *
 * Defaults to active (the ADR-specified behaviour: an activation link by email, never an
 * admin-known password). Set IS_MAILING_ACTIVE=false only for environments without a working
 * mail provider; the account is then activated immediately with a generated password that the
 * administrator must relay to the responsible out of band.
 */
export function isMailingActive(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.IS_MAILING_ACTIVE !== 'false';
}
