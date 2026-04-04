/**
 * Hardcoded admin user (same AuthContext / session as students; role: "admin").
 * Replace with backend roles when the API is ready.
 */
export const ADMIN_EMAIL = "admin@fateh.education";

export const ADMIN_PASSWORD = "FatehPS1#Ops";

/** Shown on the admin login screen (same pattern as student demo hint). */
export const ADMIN_LOGIN_HINT = `${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`;
