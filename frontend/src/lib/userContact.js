import { normalizePhone } from "./formValidation.js";

/**
 * Several For You APIs still accept `email` in query/body. Phone-only accounts
 * use a stable synthetic address (never collected or shown in the auth UI).
 */
export function apiContactEmail(user) {
  if (!user) return "";
  if (user.email) return user.email;
  const p = normalizePhone(user.phone);
  return p ? `${p}@phone.fateh` : "";
}
