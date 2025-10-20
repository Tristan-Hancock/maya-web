// src/App.tsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import type { ChatMessage } from "./types";
import { sendMessage, fetchThreadHistory } from "./services/openAIservice";
import WelcomeScreen from "./components/WelcomeScreen";
import ChatInput from "./components/ChatInput";
import ChatMessageDisplay from "./components/ChatMessage";
import { useApp } from "./appContext";

const App: React.FC = () => {
  const { activeThread, setActiveThread } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, setError] = useState<string | null>(null);
 
  
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
        const reason = (e?.reason || "").toString(); // "thread_limit_reached" | "prompt_cap" | etc.
        const cap = typeof e?.cap === "number" ? e.cap : undefined;
        const errMsg = e?.message || "Unknown error";
      
        setError(errMsg);
      
        // Rotate nice upsell lines for prompt cap
        const pickPaywall = () => {
          const PAYWALL_MESSAGES = [
            "You’ve hit today’s free message limit. 🌸 Upgrade to keep going!",
            "Daily cap reached. Subscribe to continue instantly.",
            "That’s the free limit for now. Go premium to resume your chat.",
            "Out of free messages. Upgrade for unlimited access."
          ];
          return PAYWALL_MESSAGES[Math.floor(Math.random() * PAYWALL_MESSAGES.length)];
        };
      
        let displayMessage = `Sorry, I hit an error: ${errMsg}`;
      
        if (status === 402) {
          console.log(reason);
          if (reason === "thread_limit_reached") {
            // User tried to START a new chat but free thread cap is reached
            displayMessage =
              `You’ve reached your free thread limit${cap !== undefined ? ` (${cap})` : ""}. ` +
              `Delete an older conversation or subscribe to create more threads.`;
          } else if (reason === "prompt_cap") {
            // Same thread, but they ran out of prompts
            displayMessage = pickPaywall();
          } else {
            // Generic payment-required fallthrough
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

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-[#EAEBFF] to-[#FFFFFF] text-[#191D38]">
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
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

      <div className="px-4 pb-4 md:pb-8 w-full sticky bottom-0 bg-gradient-to-t from-white via-white/90 to-transparent">
        <div className="max-w-3xl mx-auto">
          <ChatInput input={input} setInput={setInput} onSend={handleSendMessage} isLoading={isLoading} />
          <p className="text-center text-xs text-gray-500 mt-3">
            Maya can make mistakes. Consider checking important information.
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;
