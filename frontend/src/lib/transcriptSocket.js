/**
 * WebSocket service for live transcript updates
 *
 * Connects to backend WebSocket endpoint to stream transcript messages in real-time
 * Usage:
 *   const socket = new TranscriptSocket('call_sid_123');
 *   socket.on('message', (msg) => console.log(msg));
 *   socket.connect();
 */

class TranscriptSocket {
  constructor(callSid, onMessage) {
    this.callSid = callSid;
    this.onMessage = onMessage;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.isManuallyClosing = false;
  }

  connect() {
    try {
      // Determine WebSocket URL from environment or current location
      let wsUrl;
      const apiBase = import.meta.env.VITE_API_BASE_URL;

      if (apiBase) {
        // Use environment variable - convert http/https to ws/wss
        const protocol = apiBase.startsWith("https") ? "wss:" : "ws:";
        const host = apiBase.replace(/^https?:\/\//, "");
        wsUrl = `${protocol}//${host}/api/transcripts/${this.callSid}`;
      } else {
        // Fallback: use current window location
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = window.location.host;
        wsUrl = `${protocol}//${host}/api/transcripts/${this.callSid}`;
      }

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log(`[TranscriptSocket] Connected to ${this.callSid}`);
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (this.onMessage) {
            this.onMessage(message);
          }
        } catch (e) {
          console.error("[TranscriptSocket] Failed to parse message:", e);
        }
      };

      this.ws.onerror = (error) => {
        console.error("[TranscriptSocket] Error:", error);
      };

      this.ws.onclose = () => {
        console.log(`[TranscriptSocket] Disconnected from ${this.callSid}`);
        if (!this.isManuallyClosing && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnect();
        }
      };
    } catch (e) {
      console.error("[TranscriptSocket] Failed to connect:", e);
    }
  }

  reconnect() {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`[TranscriptSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    setTimeout(() => this.connect(), delay);
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn("[TranscriptSocket] WebSocket not connected");
    }
  }

  close() {
    this.isManuallyClosing = true;
    if (this.ws) {
      this.ws.close();
    }
  }

  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

export default TranscriptSocket;
