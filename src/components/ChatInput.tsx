import React, { useRef, useState } from 'react';
import PlusIcon from './icons/PlusIcon';
import MicIcon from './icons/MicIcon';
import SendIcon from './icons/SendIcon';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSend: (message: string) => void;
  isLoading: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ input, setInput, onSend, isLoading }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showPremiumPopup, setShowPremiumPopup] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSend(input);
      setInput('');
    }
  };

  const handlePremiumAlert = () => {
    setShowPremiumPopup(true);
  };

  const closePopup = () => {
    setShowPremiumPopup(false);
  };

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="bg-white/80 backdrop-blur-md flex flex-nowrap items-center p-2 rounded-full shadow-lg border border-gray-200/80 w-full"
      >
        <button
          type="button"
          onClick={handlePremiumAlert}
          className="shrink-0 p-2 text-gray-500 rounded-full transition-colors hover:bg-gray-200 hover:opacity-50"
        >
          <PlusIcon />
        </button>

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything..."
          className="flex-1 min-w-0 bg-transparent focus:outline-none px-4 text-gray-800 placeholder-gray-500"
          disabled={isLoading}
        />

        <button
          type="button"
          onClick={handlePremiumAlert}
          className="shrink-0 p-2 text-gray-500 rounded-full transition-colors hover:bg-gray-200 hover:opacity-50"
        >
          <MicIcon />
        </button>

        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="shrink-0 p-2 rounded-full text-white bg-[#6B66FF] hover:bg-[#5853e6] disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
        >
          <SendIcon />
        </button>
      </form>

      {showPremiumPopup && (
        <div
          onClick={closePopup}
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-lg p-6 text-center w-72"
          >
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Premium Required</h2>
            <p className="text-sm text-gray-600 mb-5">
              This feature is available only for premium users.
            </p>
            <button
              onClick={closePopup}
              className="px-4 py-2 rounded-full text-white"
              style={{
                backgroundColor: '#191D38',
                transition: 'background-color 0.2s ease-in-out',
              }}
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
