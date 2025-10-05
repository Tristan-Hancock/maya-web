import React, { useRef } from 'react';
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSend(input);
      setInput('');
    }
  };

  const handlePremiumAlert = () => {
    alert('Premium required');
  };

  return (
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
  );
};

export default ChatInput;
