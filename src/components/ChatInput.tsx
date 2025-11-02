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

  /** optional hooks you can wire later */
  onStartCall?: () => Promise<void> | void;
  onEndCall?: (elapsedSec: number) => Promise<void> | void;
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
  onStartCall,
  onEndCall,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string>("");

  // --- Call mode state ---
  const [callActive, setCallActive] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);

  useEffect(() => {
    if (!callActive) return;
    const t = setInterval(() => setCallSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
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

  const startCall = async () => {
    if (callActive) return;
    try {
      // hook to mint client_secret later
      await onStartCall?.();
      setCallSeconds(0);
      setCallActive(true);
    } catch (e) {
      console.warn("[voice] start failed:", (e as Error)?.message);
    }
  };

  const endCall = async () => {
    if (!callActive) return;
    setCallActive(false);
    // hook to finalize minutes later
    try { await onEndCall?.(callSeconds); } catch {}
  };

  const canSend = !isLoading && !callActive && (input.trim().length > 0 || !!file);

  return (
    <>
      {/* Suggestions (hidden while in call) */}
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

      {/* File chip (also shown in call mode so users can cancel before sending) */}
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

      {/* Input bar OR Call dock */}
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

          {/* Call button replaces mic */}
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
        // Minimal "call dock" look inside the same area
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
            {/* (Optional) a subtle animated indicator */}
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
