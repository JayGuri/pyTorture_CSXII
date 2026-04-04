/** Fateh auth — allow only expected characters and lengths. */

const EMAIL_MAX = 254;
const NAME_MAX = 80;
const PASS_MIN = 8;
const PASS_MAX = 128;

/** Letters (incl. common accented), spaces, period, apostrophe, hyphen */
const NAME_SANITIZE = /[^\p{L}\s.'-]/gu;

/**
 * Strip characters that should never appear in a display name.
 * @param {string} raw
 */
export function sanitizeFullNameInput(raw) {
  return raw.replace(NAME_SANITIZE, "").replace(/\s{2,}/g, " ").slice(0, NAME_MAX);
}

/**
 * @param {string} raw
 * @returns {{ ok: true, value: string } | { ok: false, error: string }}
 */
export function validateFullName(raw) {
  const value = raw.trim().replace(/\s+/g, " ");
  if (value.length < 2) {
    return { ok: false, error: "Enter your full name (at least 2 characters)." };
  }
  if (value.length > NAME_MAX) {
    return { ok: false, error: `Name must be at most ${NAME_MAX} characters.` };
  }
  if (!/^[\p{L}][\p{L}\s.'-]*$/u.test(value)) {
    return { ok: false, error: "Name can only include letters, spaces, and . ' -" };
  }
  return { ok: true, value };
}

/**
 * @param {string} raw
 */
export function sanitizeEmailInput(raw) {
  return raw.replace(/\s/g, "").slice(0, EMAIL_MAX);
}

const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * @param {string} raw
 */
export function validateEmail(raw) {
  const value = raw.trim().toLowerCase();
  if (!value) {
    return { ok: false, error: "Enter your email address." };
  }
  if (value.length > EMAIL_MAX) {
    return { ok: false, error: "Email is too long." };
  }
  if (!EMAIL_RE.test(value)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  return { ok: true, value };
}

/**
 * Sign-up password: ASCII printable only, letter + digit, length bounds.
 * @param {string} password
 */
export function validateNewPassword(password) {
  if (typeof password !== "string") {
    return { ok: false, error: "Enter a password." };
  }
  if (password.length < PASS_MIN) {
    return { ok: false, error: `Password must be at least ${PASS_MIN} characters.` };
  }
  if (password.length > PASS_MAX) {
    return { ok: false, error: `Password must be at most ${PASS_MAX} characters.` };
  }
  if (/[^\x21-\x7E]/.test(password)) {
    return { ok: false, error: "Password can only use letters, numbers, and common symbols." };
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { ok: false, error: "Password must include at least one letter." };
  }
  if (!/[0-9]/.test(password)) {
    return { ok: false, error: "Password must include at least one number." };
  }
  return { ok: true };
}

/**
 * Login password: non-empty, bounded (no charset restriction beyond length).
 * @param {string} password
 */
export function validateLoginPassword(password) {
  if (!password || typeof password !== "string") {
    return { ok: false, error: "Enter your password." };
  }
  if (password.length > PASS_MAX) {
    return { ok: false, error: "Invalid credentials." };
  }
  return { ok: true };
}
