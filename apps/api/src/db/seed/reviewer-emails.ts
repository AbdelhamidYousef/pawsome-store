// The seeded reviewer accounts (the 14 named reviewers and the crowd of 1100) sign reviews only and
// cannot sign in. Their e-mail shapes live here, with no imports, so runtime code (the admin
// customer list hides these accounts) can use them without pulling the seed data into the API.
export const REVIEWER_EMAIL_DOMAIN = '@pawsome.test';

/** `reviewer01@pawsome.test` … `reviewer14@pawsome.test`, as a LIKE pattern. */
export const REVIEWER_EMAIL_PATTERN = `reviewer__${REVIEWER_EMAIL_DOMAIN}`;
/** `customer0001@pawsome.test` … `customer1100@pawsome.test`, as a LIKE pattern. */
export const CROWD_EMAIL_PATTERN = `customer____${REVIEWER_EMAIL_DOMAIN}`;

export const SEEDED_REVIEWER_EMAIL_PATTERNS = [
  REVIEWER_EMAIL_PATTERN,
  CROWD_EMAIL_PATTERN,
] as const;
