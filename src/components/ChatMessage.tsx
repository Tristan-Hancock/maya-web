
import React from 'react';
import type { ChatMessage } from '../types';
import UserIcon from './icons/UserIcon';
import OveliaIcon from './icons/OveliaIcon';
import DOMPurify from 'isomorphic-dompurify';

interface ChatMessageProps {
  message: ChatMessage;
  isLoading?: boolean;
}

const TypingIndicator: React.FC = () => (
  <div className="flex items-center space-x-1">
    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
  </div>
);

const ChatMessageDisplay: React.FC<ChatMessageProps> = ({ message, isLoading = false }) => {
  const isModel = message.role === 'assistant';
  
  const formattedContent = message.content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-800 text-white p-3 rounded-md my-2 text-sm"><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="bg-gray-200 text-red-500 px-1 rounded">$1</code>')
    .replace(/\n/g, '<br />');
  const clean = DOMPurify.sanitize(formattedContent);


  return (
    <div className={`flex items-start gap-4 my-6 ${!isModel && 'flex-row-reverse'}`}>
      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${isModel ? 'bg-indigo-100' : 'bg-gray-200'}`}>
        {isModel ? <OveliaIcon className="w-full h-full object-cover rounded-full" /> : <UserIcon />}
      </div>
      <div className={`max-w-[80%] p-4 rounded-2xl ${isModel ? 'bg-white rounded-tl-none' : 'bg-[#E1E0FF] rounded-tr-none'}`}>
        {isLoading && !message.content ? (
          <TypingIndicator />
        ) : (
          <div className="text-gray-800 leading-relaxed prose" dangerouslySetInnerHTML={{ __html: clean }} />
        )}
      </div>
    </div>
  );
};

export default ChatMessageDisplay;
