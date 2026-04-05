/**
 * Hardcoded admin user (same AuthContext / session as students; role: "admin").
 * Replace with backend roles when the API is ready.
 */
export const ADMIN_EMAIL = "admin@fateh.education";

/** Sign-in uses mobile + password; admin demo matches this number. */
export const ADMIN_PHONE = "9000000001";

export const ADMIN_PASSWORD = "FatehPS1#Ops";

/** Shown next to student demo hints on the login page. */
export const ADMIN_LOGIN_HINT = `${ADMIN_PHONE} / ${ADMIN_PASSWORD}`;
