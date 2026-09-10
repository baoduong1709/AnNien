import { useState, useRef, useCallback, useEffect } from "react";
import { TranscriptItem } from "../components/LiveTranscript";
import { MedicationItem } from "../components/MedicationModal";
import { MoodItem, MemoryItem } from "../components/MoodHistoryModal";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";

export type SessionStatus = "idle" | "vad_listening" | "listening" | "thinking" | "speaking";

interface UseLiveSessionOptions {
  gatewayWsUrl: string;
  pairingCode?: string;
  onSosAlert?: (message: string) => void;
  onMedicationUpdated?: (medicineName: string, isTaken: boolean) => void;
  onStandbyMode?: (message: string) => void;
}

// Check if running inside native Tauri runtime
export const isTauriApp = (): boolean => {
  return typeof window !== "undefined" && Boolean((window as any).__TAURI_INTERNALS__);
};

export function useLiveSession({
  gatewayWsUrl,
  pairingCode,
  onSosAlert,
  onMedicationUpdated,
  onStandbyMode,
}: UseLiveSessionOptions) {
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [volumeLevel, setVolumeLevel] = useState<number>(0);
  const [medications, setMedications] = useState<MedicationItem[]>([]);
  const [moods, setMoods] = useState<MoodItem[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [aiName, setAiName] = useState<string>("");
  const [wakeWords, setWakeWords] = useState<string[]>(["cháu ơi", "an nhiên ơi"]);
  const [isStandby, setIsStandby] = useState<boolean>(false);
  const [standbyMessage, setStandbyMessage] = useState<string>("");
  const [isWakeWordListening, setIsWakeWordListening] = useState<boolean>(true);

  // Web Browser Fallback References
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioWorkletNodeRef = useRef<ScriptProcessorNode | null>(null);
  const activeAudioSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const nextScheduledTimeRef = useRef<number>(0);

  // Tauri IPC listener cleanup reference
  const tauriUnlistenRef = useRef<UnlistenFn | null>(null);

  // Construct WebSocket URL with pairing_code
  const getFullWsUrl = useCallback(() => {
    let url = gatewayWsUrl;
    if (pairingCode) {
      const sep = url.includes("?") ? "&" : "?";
      url = `${url}${sep}pairing_code=${encodeURIComponent(pairingCode)}`;
    }
    return url;
  }, [gatewayWsUrl, pairingCode]);

  // Stop all currently playing audio instantly on Barge-In (Web fallback)
  const stopAllPlayback = useCallback(() => {
    activeAudioSourcesRef.current.forEach((src) => {
      try {
        src.stop();
        src.disconnect();
      } catch (e) {
        // Source may have already completed
      }
    });
    activeAudioSourcesRef.current = [];
    nextScheduledTimeRef.current = 0;
    setStatus("listening");
  }, []);

  // Shared message handler for both Tauri IPC events and Web WebSocket
  const handleIncomingMessage = useCallback((msg: any) => {
    const type = msg.type;

    if (type === "session_started") {
      console.log("Session started successfully:", msg.session_id, "Mock:", msg.mock_mode);
      setStatus("listening");
      setIsStandby(false);
      if (msg.ai_name) setAiName(msg.ai_name);
      if (msg.wake_words) setWakeWords(msg.wake_words);
    } else if (type === "audio_chunk") {
      // In web mode, manage status and Web Audio queue
      if (!isTauriApp()) {
        setStatus("speaking");
        if (msg.data) {
          play24kPcmChunkWeb(msg.data);
        }
      }
    } else if (type === "turn_complete") {
      console.log("Model turn completed");
    } else if (type === "transcript") {
      setTranscripts((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          role: msg.role,
          text: msg.text,
          timestamp: new Date().toISOString(),
        },
      ]);
    } else if (type === "barge_in") {
      console.log("Barge-in event received:", msg.reason);
      stopAllPlayback();
      setStatus("listening");
    } else if (type === "sos_alert") {
      console.warn("CRITICAL SOS ALERT DISPATCHED:", msg);
      if (onSosAlert) {
        onSosAlert(msg.tts_text || msg.reason);
      }
      // In browser fallback, play SOS TTS audio if present
      if (!isTauriApp() && msg.tts_audio_base64) {
        play24kPcmChunkWeb(msg.tts_audio_base64);
      }
    } else if (type === "medication_updated") {
      console.log("Medication marked as taken via voice:", msg.medicine_name);
      setMedications((prev) =>
        prev.map((m) =>
          m.medicine_name.toLowerCase().includes((msg.medicine_name || "").toLowerCase()) ||
          (msg.medicine_name || "").toLowerCase().includes(m.medicine_name.toLowerCase())
            ? { ...m, is_taken: true }
            : m
        )
      );
      if (onMedicationUpdated) {
        onMedicationUpdated(msg.medicine_name, msg.is_taken);
      }
    } else if (type === "standby_mode") {
      console.log("Standby mode entered:", msg);
      stopAllPlayback();
      setIsStandby(true);
      setStandbyMessage(msg.message || "Trợ lý đang nghỉ ngơi. Cụ gọi 'Cháu ơi' để tiếp tục nhé!");
      if (!isTauriApp()) {
        stopMicrophoneCaptureWeb();
        if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
        }
      }
      setStatus("idle");
      if (onStandbyMode) {
        onStandbyMode(msg.message);
      }
    } else if (type === "medication_reminder_created") {
      setMedications((prev) => [...prev, msg.reminder]);
    } else if (type === "mood_recorded") {
      setMoods((prev) => [msg.record, ...prev]);
    } else if (type === "memory_extracted") {
      setMemories((prev) => [...prev, msg.memory]);
    }
  }, [onSosAlert, onMedicationUpdated, onStandbyMode, stopAllPlayback]);

  // Connect Session (Tauri Core native audio or Web Audio fallback)
  const connect = useCallback(async () => {
    const fullWsUrl = getFullWsUrl();

    if (isTauriApp()) {
      try {
        console.log("Starting native audio session via Tauri Core IPC with:", fullWsUrl);
        // 1. Listen for Gateway messages forwarded by Rust
        if (tauriUnlistenRef.current) {
          tauriUnlistenRef.current();
        }
        tauriUnlistenRef.current = await listen<string>("gateway_message", (event) => {
          try {
            const parsed = JSON.parse(event.payload);
            handleIncomingMessage(parsed);
          } catch (e) {
            console.error("Failed to parse gateway message from Rust:", e);
          }
        });

        // 1b. Listen for real hardware playback state from Rust AudioPlayer
        await listen<string>("playback_state", (event) => {
          try {
            const parsed = JSON.parse(event.payload);
            if (parsed.is_playing) {
              setStatus("speaking");
            } else {
              setStatus("listening");
            }
          } catch (e) {
            console.error("Failed to parse playback_state:", e);
          }
        });

        // 2. Invoke Rust command start_listening (initializes cpal mic + player + ws)
        await invoke("start_listening", { gatewayUrl: fullWsUrl });
        setStatus("listening");
        setIsStandby(false);
      } catch (err) {
        console.error("Error starting Tauri live session:", err);
        setStatus("idle");
      }
      return;
    }

    // --- Web Audio API Fallback (for browser preview) ---
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(fullWsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("Connected to AnNien Gateway WebSocket (Web Mode):", fullWsUrl);
        setStatus("listening");
        setIsStandby(false);
        startMicrophoneCaptureWeb();
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          handleIncomingMessage(msg);
        } catch (e) {
          console.error("Error processing websocket message:", e);
        }
      };

      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
      };

      ws.onclose = () => {
        console.log("WebSocket connection closed.");
        setStatus("idle");
        stopMicrophoneCaptureWeb();
      };
    } catch (e) {
      console.error("Failed to connect websocket in browser mode:", e);
      setStatus("idle");
    }
  }, [getFullWsUrl, handleIncomingMessage]);

  // Disconnect Session
  const disconnect = useCallback(async () => {
    if (isTauriApp()) {
      try {
        await invoke("stop_listening");
        if (tauriUnlistenRef.current) {
          tauriUnlistenRef.current();
          tauriUnlistenRef.current = null;
        }
      } catch (e) {
        console.error("Error stopping Tauri listening:", e);
      }
      setStatus("idle");
      return;
    }

    // Web Fallback cleanup
    stopMicrophoneCaptureWeb();
    stopAllPlayback();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus("idle");
  }, [stopAllPlayback]);

  // Web fallback: Audio capture 16kHz 16-bit Mono PCM with feedback protection
  const startMicrophoneCaptureWeb = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(2048, 1, 1);
      audioWorkletNodeRef.current = processor;

      // Connect through a zero-gain node to destination to prevent mic loopback howl
      const muteGain = audioCtx.createGain();
      muteGain.gain.value = 0.0;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);

        // Volume level calculation for visualizer
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        setVolumeLevel(Math.min(1.0, rms * 5));

        // Convert Float32 to 16-bit linear PCM little-endian
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        // Send to WebSocket
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const uint8 = new Uint8Array(pcm16.buffer);
          let binary = "";
          for (let i = 0; i < uint8.byteLength; i++) {
            binary += String.fromCharCode(uint8[i]);
          }
          const base64Data = window.btoa(binary);

          wsRef.current.send(
            JSON.stringify({
              type: "audio_chunk",
              data: base64Data,
              sample_rate: 16000,
            })
          );
        }
      };

      source.connect(processor);
      processor.connect(muteGain);
      muteGain.connect(audioCtx.destination);
    } catch (err) {
      console.warn("Could not access microphone directly (mocking or permission needed):", err);
    }
  };

  const stopMicrophoneCaptureWeb = () => {
    if (audioWorkletNodeRef.current) {
      audioWorkletNodeRef.current.disconnect();
      audioWorkletNodeRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  // Web fallback: Sequentially schedule 24kHz PCM chunks without audio overlap
  const play24kPcmChunkWeb = (base64Pcm: string) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const audioCtx = audioContextRef.current;

      const binary = window.atob(base64Pcm);
      // Ensure even byte length for 16-bit PCM
      const alignedLength = binary.length - (binary.length % 2);
      if (alignedLength === 0) return;

      const bytes = new Uint8Array(alignedLength);
      for (let i = 0; i < alignedLength; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const int16Array = new Int16Array(bytes.buffer);

      const audioBuffer = audioCtx.createBuffer(1, int16Array.length, 24000);
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < int16Array.length; i++) {
        channelData[i] = int16Array[i] / 32768.0;
      }

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);

      activeAudioSourcesRef.current.push(source);

      // Schedule at future queue time to prevent chunks from overlapping
      const startTime = Math.max(audioCtx.currentTime, nextScheduledTimeRef.current);
      source.start(startTime);
      nextScheduledTimeRef.current = startTime + audioBuffer.duration;

      source.onended = () => {
        activeAudioSourcesRef.current = activeAudioSourcesRef.current.filter((s) => s !== source);
        if (activeAudioSourcesRef.current.length === 0) {
          setStatus("listening");
        }
      };
    } catch (e) {
      console.error("Error playing audio chunk in web mode:", e);
    }
  };

  // Send manual text turn
  const sendTextTurn = async (text: string) => {
    setTranscripts((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(7),
        role: "user",
        text,
        timestamp: new Date().toISOString(),
      },
    ]);
    setStatus("thinking");

    if (isTauriApp()) {
      try {
        await invoke("send_text", { text });
      } catch (e) {
        console.error("Error sending text via Tauri IPC:", e);
      }
      return;
    }

    // Web Fallback
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "text_message",
          text,
        })
      );
    }
  };

  // Trigger manual interrupt / barge-in
  const triggerBargeIn = async () => {
    stopAllPlayback();

    if (isTauriApp()) {
      try {
        await invoke("barge_in");
      } catch (e) {
        console.error("Error dispatching barge-in via Tauri IPC:", e);
      }
      return;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "interrupt" }));
    }
  };

  // Trigger emergency SOS via Tauri IPC or WebSocket
  const triggerSos = async (reason: string) => {
    if (isTauriApp()) {
      try {
        await invoke("trigger_emergency_sos", { reason });
      } catch (e) {
        console.error("Error triggering SOS via Tauri IPC:", e);
      }
      return;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "trigger_sos",
          reason,
        })
      );
    }
  };

  // VAD (Voice Activity Detection) — lắng nghe mic thụ động
  const vadUnlistenRef = useRef<UnlistenFn | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const SILENCE_TIMEOUT_MS = 5 * 60 * 1000; // 5 phút

  // Start VAD mode: mic on, chỉ phát hiện giọng nói, không stream
  const startVad = useCallback(async () => {
    if (!isTauriApp()) return;

    try {
      // Cleanup old VAD listener
      if (vadUnlistenRef.current) {
        vadUnlistenRef.current();
        vadUnlistenRef.current = null;
      }

      // Listen for voice_detected event from Rust
      vadUnlistenRef.current = await listen<string>("voice_detected", () => {
        console.log("[VAD] Voice detected → connecting to Gemini...");
        // Stop VAD, start full session
        invoke("stop_vad_listening").catch(() => {});
        connect();
      });

      // Start Rust VAD
      await invoke("start_vad_listening");
      setStatus("vad_listening");
      console.log("[VAD] Passive voice detection started");
    } catch (err) {
      console.error("Failed to start VAD:", err);
      setStatus("idle");
    }
  }, [connect]);

  // Disconnect AI session and return to VAD mode
  const disconnectToVad = useCallback(async () => {
    console.log("[Silence] 5 min timeout → disconnecting, returning to VAD...");
    await disconnect();
    // Small delay then restart VAD
    setTimeout(() => {
      startVad();
    }, 1000);
  }, [disconnect, startVad]);

  // Silence timeout: reset 5-min timer on each incoming message (user or AI talking)
  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    silenceTimerRef.current = setTimeout(() => {
      disconnectToVad();
    }, SILENCE_TIMEOUT_MS);
  }, [disconnectToVad]);

  // Reset silence timer whenever status changes to active states
  useEffect(() => {
    if (status === "listening" || status === "thinking" || status === "speaking") {
      resetSilenceTimer();
    } else {
      // Clear timer when not in active session
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    }
  }, [status, resetSilenceTimer]);

  // Also reset timer on each incoming transcript (means conversation is active)
  useEffect(() => {
    if (transcripts.length > 0 && (status === "listening" || status === "speaking")) {
      resetSilenceTimer();
    }
  }, [transcripts.length, status, resetSilenceTimer]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (tauriUnlistenRef.current) {
        tauriUnlistenRef.current();
      }
      if (vadUnlistenRef.current) {
        vadUnlistenRef.current();
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, []);

  return {
    status,
    transcripts,
    volumeLevel,
    medications,
    moods,
    memories,
    aiName,
    wakeWords,
    isStandby,
    standbyMessage,
    isWakeWordListening,
    setIsWakeWordListening,
    connect,
    disconnect,
    disconnectToVad,
    startVad,
    sendTextTurn,
    triggerBargeIn,
    triggerSos,
    setMedications,
    isTauri: isTauriApp(),
  };
}
