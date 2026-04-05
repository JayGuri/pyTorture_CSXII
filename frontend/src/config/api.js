/**
 * API Configuration
 *
 * Change API_BASE_URL to switch between localhost and deployed backend
 *
 * Local: http://localhost:8000
 * Deployed: https://2cc5-14-139-125-231.ngrok-free.app
 */

// ===== CHANGE THIS TO SWITCH BACKENDS =====
export const API_BASE_URL = "http://localhost:8000";
// export const API_BASE_URL = "https://2cc5-14-139-125-231.ngrok-free.app";
// ==========================================

/**
 * Convert HTTP/HTTPS URL to WebSocket protocol
 */
export function getWebSocketUrl(callSid) {
  const protocol = API_BASE_URL.startsWith("https") ? "wss:" : "ws:";
  const host = API_BASE_URL.replace(/^https?:\/\//, "");
  return `${protocol}//${host}/api/transcripts/${callSid}`;
}
