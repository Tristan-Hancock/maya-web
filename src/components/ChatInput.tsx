// Replace the component with this version

import React, { useRef, useState, useEffect, useMemo } from 'react';
import PlusIcon from './icons/PlusIcon';
import MicIcon from './icons/MicIcon';
import SendIcon from './icons/SendIcon';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSend: (message: string) => void;
  isLoading: boolean;
  suggestions?: string[];
  onSendFile?: (file: File, userMessage: string) => void;
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

const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  onSend,
  isLoading,
  suggestions = DEFAULT_SUGGESTIONS,
  onSendFile,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [showPremiumPopup, setShowPremiumPopup] = useState(false); // still used for voice only
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string>("");

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
    fileRef.current?.click(); // no premium popup for uploads
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

  const canSend = !isLoading && (input.trim().length > 0 || !!file);

  return (
    <>
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

      {file && (
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
      {fileError && (
        <div className="mb-2 text-xs text-red-600" role="alert">{fileError}</div>
      )}

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
          onClick={() => setShowPremiumPopup(true)} // voice remains premium-gated
          className="shrink-0 p-2 text-gray-500 rounded-full transition-colors hover:bg-gray-200 hover:opacity-50"
          aria-label="Voice input (Premium)"
        >
          <MicIcon />
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

      {showPremiumPopup && (
        <div onClick={() => setShowPremiumPopup(false)} className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-lg p-6 text-center w-72">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Premium Required</h2>
            <p className="text-sm text-gray-600 mb-5">This feature is available only for premium users.</p>
            <button
              onClick={() => setShowPremiumPopup(false)}
              className="px-4 py-2 rounded-full text-white"
              style={{ backgroundColor: '#191D38', transition: 'background-color 0.2s ease-in-out' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2A3162')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#191D38')}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatInput;
