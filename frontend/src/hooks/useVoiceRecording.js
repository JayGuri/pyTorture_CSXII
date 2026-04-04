/**
 * useVoiceRecording Hook
 * Manages microphone access and audio recording with Web Audio API
 */

import { useState, useRef, useCallback, useEffect } from 'react';

export function useVoiceRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const audioContextRef = useRef(null);

  // Initialize audio context and request microphone access
  const initializeAudio = useCallback(async () => {
    try {
      setError(null);
      
      // Get microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      // Initialize Web Audio API context for real-time visualization
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      // Initialize MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      audioChunksRef.current = [];

      mediaRecorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      });

      mediaRecorderRef.current = mediaRecorder;
      return true;
    } catch (err) {
      setError(`Microphone access denied: ${err.message}`);
      return false;
    }
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    const initialized = await initializeAudio();
    if (!initialized) return;

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      audioChunksRef.current = [];

      // Timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
  }, [initializeAudio]);

  // Stop recording and return audio blob
  const stopRecording = useCallback(() => {
    return new Promise((resolve) => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          setIsRecording(false);
          clearInterval(timerRef.current);

          resolve(audioBlob);
        };

        mediaRecorderRef.current.stop();

        // Stop all audio tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }
      }
    });
  }, []);

  // Convert blob to base64
  const blobToBase64 = useCallback((blob) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.readAsDataURL(blob);
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    isRecording,
    recordingTime,
    error,
    isProcessing,
    setIsProcessing,
    startRecording,
    stopRecording,
    blobToBase64,
    cleanup: () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    },
  };
}
