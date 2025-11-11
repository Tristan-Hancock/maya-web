// src/App.tsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import type { ChatMessage } from "./types";
import { sendMessage, sendDocument, fetchThreadHistory } from "./services/openAIservice";
import WelcomeScreen from "./components/WelcomeScreen";
import ChatInput from "./components/ChatInput";
import ChatMessageDisplay from "./components/ChatMessage";
import { useApp } from "./appContext";
import { useRealtimeCall } from "./services/useRealtimeCall";
import VoiceGateModal from "./components/voicemodel";
import SubscriptionPage from "./components/subscriptions/Subscription";
import { createVoiceSession, endVoiceSession } from "./services/openAIservice";
// Extend the local shape to allow an optional filename chip without
// forcing a global types change.
type ChatItem = ChatMessage & { attachmentName?: string | null };

const App: React.FC = () => {
  const { activeThread, setActiveThread } = useApp();
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, setError] = useState<string | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const voice = useRealtimeCall();
  const [voiceGate, setVoiceGate] = useState<Parameters<typeof VoiceGateModal>[0]["gate"]>(null);
  const [showSub, setShowSub] = useState(false);
  const onVoicePreflight = async () => {
    const { client_secret, session_deadline_ms } = await createVoiceSession();
    return { client_secret, session_deadline_ms };
  };
  const onStartCallWithSecret = async (clientSecret: string, sessionDeadlineMs?: number) => {
    await voice.start({
      clientSecret,
      sessionDeadlineMs,
      onRemoteAudio: (el) => {
        const root = document.getElementById("voice-audio-root");
        if (root) { root.innerHTML = ""; root.appendChild(el); }
      },
    });
  };
  const onEndCallSettle = async (elapsedSec: number) => {
    try { await endVoiceSession(elapsedSec); } catch {}
    await voice.stop(undefined);
  };
  
  const onVoiceBlocked = (err: any) => {
    if (err?.message === "voice_not_wired") {
      console.warn("[voice] ChatInput not wired correctly");
      return;
    }
    setVoiceGate(buildVoiceGate(err));
  };
  // load history whenever activeThread changes
  useEffect(() => {
    (async () => {
      if (!activeThread) {
        setMessages([]);
        return;
      }
      try {
        const hist = await fetchThreadHistory(activeThread, 50);
        setMessages(hist.map((m) => ({ role: m.role, content: m.content })));
      } catch (e: any) {
        console.warn("[history] load failed:", e?.message);
        setMessages([]); // fail-safe
      }
    })();
  }, [activeThread]);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight });
  }, [messages]);

  // loading thread sign overlay (kept as-is)
  useEffect(() => {
    (async () => {
      if (!activeThread) {
        setMessages([]);
        setThreadLoading(false);
        return;
      }
      setThreadLoading(true);
      try {
        const hist = await fetchThreadHistory(activeThread, 50);
        setMessages(hist.map(m => ({ role: m.role, content: m.content })));
      } catch (e: any) {
        console.warn("[history] load failed:", e?.message);
        setMessages([]);
      } finally {
        setThreadLoading(false);
      }
    })();
  }, [activeThread]);

  const handleSendMessage = useCallback(
    async (message: string) => {
      if (!message.trim() || isLoading) return;
      setIsLoading(true);
      setError(null);

      // optimistic user message + placeholder
      setMessages((prev) => [...prev, { role: "user", content: message }]);
      const placeholderIndex = messages.length + 1;
      setMessages((prev) => [...prev, { role: "assistant", content: "typing... " }]);

      try {
        const { threadHandle: newHandle, message: reply } = await sendMessage(
          message,
          activeThread ?? undefined
        );

        // if we just created a new thread, promote it globally
        if (!activeThread && newHandle) setActiveThread(newHandle);

        setMessages((prev) => {
          const copy = [...prev];
          copy[placeholderIndex] = { role: "assistant", content: reply };
          return copy;
        });
      } catch (e: any) {
        const status = e?.status;
        const reason = (e?.reason || e?.kind || "").toString(); // "thread_limit_reached" | "prompt_cap" | etc.
        const cap = typeof e?.cap === "number" ? e.cap : undefined;
        const errMsg = e?.message || "Unknown error";

        setError(errMsg);

        // Rotate nice upsell lines for prompt/doc caps
        const pickPaywall = () => {
          const PAYWALL_MESSAGES = [
            "You’ve hit today’s free message limit. 🌸 Upgrade to keep going!",
            "Daily cap reached. Subscribe to continue instantly.",
            "That’s the free limit for now. Go premium to resume your chat.",
            "Out of free messages. Upgrade for more."
          ];
          return PAYWALL_MESSAGES[Math.floor(Math.random() * PAYWALL_MESSAGES.length)];
        };

        let displayMessage = `Sorry, I hit an error: ${errMsg}`;

        if (status === 402) {

          if (reason === "thread_limit_reached") {
            displayMessage =
              `You’ve reached your free thread limit${cap !== undefined ? ` (${cap})` : ""}. ` +
              `Delete an older conversation or subscribe to create more threads.`;
          } else if (reason === "prompt_cap") {
            displayMessage = pickPaywall();
          } else if (reason === "doc_cap") {
            // Document upload cap reached (parity with messages/threads)
            displayMessage =
              `You’ve reached your document upload limit${cap !== undefined ? ` (${cap})` : ""}. ` +
              `Upgrade your plan to attach more documents.`;
          } else {
            displayMessage = pickPaywall();
          }
        } else if (/invalid_thread_handle/i.test(errMsg)) {
          // Stale/invalid handle — clear it so next send starts fresh
          try {
            const subKey = (window as any)._mayaSubKey as string | undefined;
            if (subKey) localStorage.removeItem(`maya:${subKey}:threadHandle`);
          } catch {}
          setActiveThread(null);
          displayMessage = "That conversation handle looks stale. I’ve reset it—try sending again.";
        }

        setMessages(prev => {
          const copy = [...prev];
          copy[placeholderIndex] = { role: "assistant", content: displayMessage };
          return copy;
        });
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, activeThread, messages.length, setActiveThread]
  );

  // NEW: handle document + optional context, with doc-cap parity
  const handleSendFile = useCallback(
    async (file: File, userMessage: string) => {
      if (isLoading) return;
      setIsLoading(true);
      setError(null);

      const label = userMessage?.trim() ?? "";

      // optimistic user bubble with filename chip
      setMessages((prev) => [
        ...prev,
        { role: "user", content: label, attachmentName: file.name },
      ]);
      const placeholderIndex = messages.length + 1;
      setMessages((prev) => [...prev, { role: "assistant", content: "typing... " }]);

      try {
        const { threadHandle: newHandle, message: reply } = await sendDocument(
          file,
          label,
          activeThread ?? undefined
        );

        if (!activeThread && newHandle) setActiveThread(newHandle);

        setMessages((prev) => {
          const copy = [...prev];
          copy[placeholderIndex] = { role: "assistant", content: reply };
          return copy;
        });
      } catch (e: any) {
        const status = e?.status;
        const reason = (e?.reason || e?.kind || "").toString(); // expects "doc_cap" on 402
        const cap = typeof e?.cap === "number" ? e.cap : undefined;
        const errMsg = e?.message || "Upload failed";

        let displayMessage = `Sorry, I couldn’t read that file: ${errMsg}`;
        if (status === 402) {
          if (reason === "thread_limit_reached") {
            displayMessage =
              `You’ve reached your free thread limit${cap !== undefined ? ` (${cap})` : ""}. ` +
              `Delete an older conversation or subscribe to create more threads.`;
          } else if (reason === "doc_cap") {
            displayMessage =
              `You’ve reached your document upload limit${cap !== undefined ? ` (${cap})` : ""}. ` +
              `Upgrade your plan to attach more documents.`;
          } else if (reason === "prompt_cap") {
            displayMessage = "You’ve hit today’s free message limit. 🌸 Upgrade to keep going!";
          }
        }

        setMessages((prev) => {
          const copy = [...prev];
          copy[placeholderIndex] = { role: "assistant", content: displayMessage };
          return copy;
        });
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, activeThread, messages.length, setActiveThread]
  );







//handling the errors here 
  function buildVoiceGate(err: any) {
    // createVoiceSession throws with { status, kind, reason, cap, used, wait_ms }
    if (err?.status === 402 && (err?.kind === "voice_cap" || err?.reason)) {
      const reason = String(err.reason || "");
      if (reason === "cooldown_active") {
        return { kind: "cooldown_active" as const, waitMs: Number(err.wait_ms || 0) };
      }
      if (reason === "minutes_exhausted") {
        return { kind: "minutes_exhausted" as const, used: err.used, cap: err.cap };
      }
      if (reason === "voice_disabled") return { kind: "voice_disabled" as const };
      if (reason === "concurrent_call") return { kind: "concurrent_call" as const };
      return { kind: "generic" as const, message: "Upgrade to use voice or try again later." };
    }
    // Non-402
    return { kind: "generic" as const, message: err?.message || "Voice is unavailable right now." };
  }
   // simple upgrade action
   const goUpgrade = () => {
    setVoiceGate(null);
    setShowSub(true);     // open pricing modal
  };
  
  return (
    <div className="flex flex-col min-h-screen text-[#191D38] bg-[repeating-linear-gradient(to_bottom,#EAEBFF_0%,#FFFFFF_40%,#EAEBFF_80%)]">
        {/* hidden container to host the remote <audio> element */}
        {/* was hidden */}
<div id="voice-audio-root" className="fixed w-0 h-0 overflow-hidden opacity-0 pointer-events-none" aria-hidden="true" />

      {/* messages area with overlay */}
      <div className="relative flex-1">
        {threadLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <div className="flex items-center gap-3 rounded-2xl bg-white/90 border border-gray-200 shadow px-4 py-3">
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" className="opacity-25" />
                <path d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill="currentColor" className="opacity-75" />
              </svg>
              <span className="text-sm text-gray-700">Loading thread…</span>
            </div>
          </div>
        )}

        <div
          ref={chatContainerRef}
          className={`h-full overflow-y-auto p-4 md:p-6 space-y-6 transition-opacity ${
            threadLoading ? "opacity-40 pointer-events-none" : ""
          }`}
        >
          {messages.length === 0 ? (
            <WelcomeScreen />
          ) : (
            <div className="max-w-3xl mx-auto w-full">
              {messages.map((msg, index) => (
                <ChatMessageDisplay key={index} message={msg} />
              ))}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <ChatMessageDisplay
                  message={{ role: "assistant", content: "typing... " }}
                  isLoading={true}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* input */}
      <div className="px-4 pb-4 md:pb-8 w-full sticky bottom-0 bg-gradient-to-t from-white via-white/90 to-transparent">
        <div className="max-w-3xl mx-auto">
       <ChatInput
  input={input}
  setInput={setInput}
  onSend={handleSendMessage}
  onSendFile={handleSendFile}
  isLoading={isLoading}
  onVoicePreflight={onVoicePreflight}
  onStartCall={onStartCallWithSecret}
  onEndCall={onEndCallSettle}
  onVoiceBlocked={onVoiceBlocked}
/>
          <p className="text-center text-xs text-gray-500 mt-3">
            Maya can make mistakes. Consider checking important information.
          </p>
        </div>
      </div>
      <VoiceGateModal
  gate={voiceGate}
  onClose={() => setVoiceGate(null)}
  onUpgrade={goUpgrade}
/>

{showSub && (
  <SubscriptionPage onClose={() => setShowSub(false)} />
)}

    </div>
    
  );
};

export default App;

