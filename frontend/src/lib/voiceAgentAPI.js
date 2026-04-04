/**
 * Voice Agent API Client
 * Handles communication with backend voice agent endpoints
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const voiceAgentAPI = {
  /**
   * Process audio chunk with sentiment analysis and data extraction
   */
  async transcribeVoice(audioBase64, sessionId, language = 'en', userId = null) {
    const payload = {
      audio_base64: audioBase64,
      session_id: sessionId,
      language,
      user_id: userId,
    };

    console.log('[VoiceAPI] Sending transcribe request', {
      sessionId,
      language,
      userId,
      audioLength: audioBase64 ? audioBase64.length : 0,
      audioBase64Sample: audioBase64 ? audioBase64.substring(0, 50) : 'EMPTY',
    });

    const response = await fetch(`${API_BASE}/api/voice-agent/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[VoiceAPI] Error response:', errorData);
      throw new Error(`Transcription failed: ${response.statusText} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    return {
      success: data.success,
      transcription: data.transcription,
      userSentiment: data.user_sentiment,
      sentimentConfidence: data.sentiment_confidence,
      extractedData: data.extracted_data,
      dataCoverage: data.data_coverage,
      conversationTurn: data.conversation_turn,
      sessionSummary: data.session_summary,
      latencyMs: data.latency_ms,
      error: data.error,
    };
  },

  /**
   * Analyze sentiment of text
   */
  async analyzeSentiment(text, language = 'en') {
    const response = await fetch(`${API_BASE}/api/voice-agent/sentiment-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        language,
      }),
    });

    if (!response.ok) {
      throw new Error(`Sentiment analysis failed: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Extract data points from text
   */
  async extractData(text, language = 'en') {
    const response = await fetch(`${API_BASE}/api/voice-agent/extract-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        language,
      }),
    });

    if (!response.ok) {
      throw new Error(`Data extraction failed: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Get conversation context for a session
   */
  async getSessionContext(sessionId) {
    const response = await fetch(`${API_BASE}/api/voice-agent/session/${sessionId}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to get session context: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Clear conversation context for a session
   */
  async clearSession(sessionId) {
    const response = await fetch(`${API_BASE}/api/voice-agent/session/${sessionId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to clear session: ${response.statusText}`);
    }

    return response.json();
  },
};
