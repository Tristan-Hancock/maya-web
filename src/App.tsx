
import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { ChatMessage } from './types';
import { sendMessage } from './services/openAIservice';
import WelcomeScreen from './components/WelcomeScreen';
import ChatInput from './components/ChatInput';
import ChatMessageDisplay from './components/ChatMessage';
//test 
const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(typeof window !== 'undefined' ? localStorage.getItem("threadId") : null);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  
  const handleSendMessage = useCallback(async (message: string) => {
    if (!message.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    // Push user message
    setMessages(prev => [...prev, { role: 'user', content: message }]);

    // Placeholder for assistant
    const placeholderIndex = messages.length + 1;
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const { threadId: tid, message: reply } = await sendMessage(message, threadId ?? undefined);

      if (!threadId) {
        setThreadId(tid);
        localStorage.setItem("threadId", tid);
      }

      setMessages(prev => {
        const copy = [...prev];
        copy[placeholderIndex] = { role: 'assistant', content: reply };
        return copy;
      });
    } catch (e: any) {
      const errorMessage = e?.message || "Unknown error";
      setError(errorMessage);
      setMessages(prev => {
        const copy = [...prev];
        copy[placeholderIndex] = { role: 'assistant', content: `Sorry, I hit an error: ${errorMessage}` };
        return copy;
      });
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, threadId, messages.length]);

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
            {isLoading && messages[messages.length-1]?.role === 'user' && (
               <ChatMessageDisplay message={{role: 'assistant', content: ''}} isLoading={true} />
            )}
          </div>
        )}
      </div>

      <div className="px-4 pb-4 md:pb-8 w-full sticky bottom-0 bg-gradient-to-t from-white via-white/90 to-transparent">
        <div className="max-w-3xl mx-auto">
          <ChatInput
            input={input}
            setInput={setInput}
            onSend={handleSendMessage}
            isLoading={isLoading}
          />
           <p className="text-center text-xs text-gray-500 mt-3">
            Maya can make mistakes. Consider checking important information.
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;
