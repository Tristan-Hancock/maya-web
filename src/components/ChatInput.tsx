import React, { useRef, useState, useEffect, useMemo } from 'react';
import PlusIcon from './icons/PlusIcon';
import CallIcon from './icons/callIcon';
import SendIcon from './icons/SendIcon';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSend: (message: string) => void;
  isLoading: boolean;
  suggestions?: string[];
  onSendFile?: (file: File, userMessage: string) => void;

  // Voice flow hooks
  onVoicePreflight?: () => Promise<{
    client_secret: string;
    session_deadline_ms?: number;
    session_started_ms?: number;   // ← new
  }>;
  onStartCall?: (clientSecret: string, sessionDeadlineMs?: number, sessionStartedMs?: number) => Promise<void> | void; // ← accepts deadline + started ms
  onEndCall?: (elapsedSec: number) => Promise<void> | void;
  onVoiceBlocked?: (err: any) => void;

}

const DEFAULT_SUGGESTIONS = [
  "What are common PCOS symptoms?",
  "Can PCOS cause irregular periods?",
  "How to manage PCOS with diet?",
  "What lab tests diagnose PCOS?",
  "How does PCOS affect fertility?",
];

const FIXED_QUESTION = "im afraid i might be pregnant";

const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);
const MAX_SIZE_MB = 10;

function sampleTwo(pool: string[]): [string, string] {
  const p = [...pool];
  for (let i = p.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  const a = p[0] ?? "How to manage PCOS with diet?";
  const b = p.find((x) => x !== a) ?? "What lab tests diagnose PCOS?";
  return [a, b];
}

function formatClock(totalSec: number) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  onSend,
  isLoading,
  suggestions = DEFAULT_SUGGESTIONS,
  onSendFile,
  onVoicePreflight,
  onStartCall,
  onEndCall,
  onVoiceBlocked,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string>("");

  // --- Call mode state ---
  const [callActive, setCallActive] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);

  // timer to auto-end call
  const endTimerRef = useRef<number | null>(null);
  const clearEndTimer = () => {
    if (endTimerRef.current !== null) {
      window.clearTimeout(endTimerRef.current);
      endTimerRef.current = null;
    }
  };
  useEffect(() => () => clearEndTimer(), []);

  useEffect(() => {
    if (!callActive) return;
    const t = window.setInterval(() => setCallSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [callActive]);

  const pool = useMemo(() => {
    const set = new Set(
      [...DEFAULT_SUGGESTIONS, ...suggestions].filter(
        (s) => s.trim().toLowerCase() !== FIXED_QUESTION
      )
    );
    return Array.from(set);
  }, [suggestions]);

  const [[leftSug, rightSug], setTwo] = useState<[string, string]>(() => sampleTwo(pool));
  useEffect(() => { setTwo(sampleTwo(pool)); }, [pool]);

  function openPicker() {
    fileRef.current?.click();
  }

  function validateAndStage(f: File | undefined) {
    setFileError("");
    if (!f) return;
    if (!ALLOWED_MIME.has(f.type)) {
      setFileError("Only PDF, DOC, DOCX, or TXT.");
      return;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setFileError(`Max ${MAX_SIZE_MB} MB.`);
      return;
    }
    setFile(f);
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    validateAndStage(f);
    e.currentTarget.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    const text = input.trim();

    if (file && onSendFile) {
      onSendFile(file, text);
      setFile(null);
      setInput("");
      return;
    }

    if (text) {
      onSend(text);
      setInput('');
    }
  };

  const handleSuggestionClick = (text: string) => {
    setInput(text);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  // Start call with preflight gating
  const startCall = async () => {
    if (callActive) return;
    try {
      if (!onVoicePreflight || !onStartCall) throw new Error("voice_not_wired");

      console.log("[voice] preflight → server");
      const { client_secret, session_deadline_ms, session_started_ms } = await onVoicePreflight();
      console.log("[voice] preflight OK", { session_deadline_ms, session_started_ms: !!session_started_ms });

      // initialize callSeconds aligned to server start if provided
      setCallSeconds(() => {
        if (session_started_ms && session_started_ms < Date.now()) {
          const secs = Math.max(0, Math.floor((Date.now() - session_started_ms) / 1000));
          return secs;
        }
        return 0;
      });

      console.log("[voice] onStartCall with client_secret…");

      // Pass server start + deadline through to parent onStartCall
      await onStartCall(client_secret, session_deadline_ms, session_started_ms);

      // UI state
      setCallActive(true);
      console.log("[voice] callActive=true");

      clearEndTimer();

      // Primary auto-end handled by hook via onAutoEnd; but parent still sets a UI timer (redundant)
      // Set UI-only fallback timer (same logic you had before) to ensure UX updates
      if (session_deadline_ms && session_deadline_ms > Date.now()) {
        const ms = Math.max(0, session_deadline_ms - Date.now() - 1000);
        endTimerRef.current = window.setTimeout(() => { endCall(); }, ms);
        console.log("[voice] auto-end timer set (ms):", ms);
      } else {
        endTimerRef.current = window.setTimeout(() => endCall(), 50_000);
        console.log("[voice] fallback auto-end timer set (50s)");
      }
    } catch (e: any) {
      console.error("[voice] blocked/error:", e);
      onVoiceBlocked?.(e);
    }
  };

  const endCall = async () => {
    if (!callActive) return;
    clearEndTimer();
    setCallActive(false);
    const secs = callSeconds;
    setCallSeconds(0);
    console.log("[voice] ending call, elapsedSec:", secs);
    try {
      // Ensure the parent calls backend /voice/end exactly once
      await onEndCall?.(secs);
    } catch (e) {
      console.warn("[voice] endCall error:", e);
    }
  };
    // Listen for global auto-end dispatched by App so UI updates when server/Hook ends the call
    useEffect(() => {
      const handler = (ev: Event) => {
        try {
          const detail = (ev as CustomEvent)?.detail || {};
          const elapsed = typeof detail.elapsedSec === "number" ? detail.elapsedSec : callSeconds;
          // stop local timers and update UI
          clearEndTimer();
          setCallActive(false);
          setCallSeconds(elapsed || 0);
          console.log("[voice] received maya_voice_auto_end, UI updated, elapsed:", elapsed);
        } catch (err) {
          console.warn("[voice] maya_voice_auto_end handler error", err);
        }
      };
      window.addEventListener("maya_voice_auto_end", handler as EventListener);
      return () => {
        window.removeEventListener("maya_voice_auto_end", handler as EventListener);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
  

  const canSend = !isLoading && !callActive && (input.trim().length > 0 || !!file);

  return (
    <>
      {!callActive && (
        <div className="w-full mb-2 overflow-x-auto no-scrollbar" aria-label="Quick suggestions" role="list">
          <div className="flex gap-2 pr-1">
            {[leftSug, FIXED_QUESTION, rightSug].map((s, i) => (
              <button
                key={`${i}-${s}`}
                type="button"
                role="listitem"
                onClick={() => handleSuggestionClick(s)}
                className="shrink-0 rounded-full border border-gray-200 bg-white/80 backdrop-blur px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#6B66FF]"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {file && !callActive && (
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm bg-white">
          <span className="truncate max-w-[240px]">{file.name}</span>
          <button
            type="button"
            className="text-gray-500 hover:text-gray-900"
            aria-label="Remove file"
            onClick={() => setFile(null)}
          >
            ×
          </button>
        </div>
      )}
      {fileError && !callActive && (
        <div className="mb-2 text-xs text-red-600" role="alert">{fileError}</div>
      )}

      {!callActive ? (
        <form
          onSubmit={handleSubmit}
          className="bg-white/80 backdrop-blur-md flex flex-nowrap items-center p-2 rounded-full shadow-lg border border-gray-200/80 w-full"
        >
          <button
            type="button"
            onClick={openPicker}
            className="shrink-0 p-2 text-gray-500 rounded-full transition-colors hover:bg-gray-200 hover:opacity-50"
            aria-label="Add attachment"
          >
            <PlusIcon />
          </button>

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={file ? "Add context for your document…" : "Ask anything..."}
            className="flex-1 min-w-0 bg-transparent focus:outline-none px-4 text-gray-800 placeholder-gray-500"
            disabled={isLoading}
          />

          <button
            type="button"
            onClick={startCall}
            className="shrink-0 p-2 text-gray-500 rounded-full transition-colors hover:bg-gray-200 hover:opacity-50"
            aria-label="Start call"
          >
            <CallIcon className="w-6 h-6" />
          </button>

          <button
            type="submit"
            disabled={!canSend}
            className="shrink-0 p-2 rounded-full text-white bg-[#6B66FF] hover:bg-[#5853e6] disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
            aria-label="Send message"
          >
            <SendIcon />
          </button>

          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            hidden
            onChange={handleFileChange}
          />
        </form>
      ) : (
        <div className="bg-white/90 backdrop-blur-md flex items-center justify-between p-3 rounded-2xl shadow-lg border border-gray-200/80 w-full">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#6B66FF]/10 grid place-items-center">
              <CallIcon className="w-5 h-5 text-[#6B66FF]" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-[#191D38]">On call with Maya</span>
              <span className="text-xs text-gray-600">{formatClock(callSeconds)} • connected</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 mr-2">
              <span className="w-1.5 h-3 rounded bg-gray-300 animate-[pulse_800ms_ease-in-out_infinite]" />
              <span className="w-1.5 h-4 rounded bg-gray-400 animate-[pulse_1000ms_ease-in-out_infinite]" />
              <span className="w-1.5 h-5 rounded bg-gray-500 animate-[pulse_1200ms_ease-in-out_infinite]" />
            </div>

            <button
              type="button"
              onClick={endCall}
              className="px-4 py-2 rounded-full text-white bg-rose-600 hover:bg-rose-700 transition-colors"
              aria-label="End call"
            >
              End call
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatInput;
