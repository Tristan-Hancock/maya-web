
import React from 'react';
import { PlusIcon, MessageIcon, CloseIcon } from '../icons/sidebaricons';

interface SidebarProps {
  isOpen: boolean;
  currentThreadId: string | null;
  onNewChat: () => void;
  onSelectThread: (threadId: string) => void;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, currentThreadId, onNewChat, onSelectThread, onClose }) => {
  return (
    <>
      <div 
        className={`fixed top-0 left-0 h-full bg-gray-800 text-white w-64 p-4 z-40 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">History</h2>
            <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-700 md:hidden">
                <CloseIcon className="w-6 h-6" />
            </button>
        </div>
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 mb-4 rounded-md bg-indigo-500 hover:bg-indigo-600 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          <span>New Chat</span>
        </button>
        <nav className="flex-1 overflow-y-auto">
          <ul>
         {/*add thread calling here */}
          </ul>
        </nav>
      </div>
      {isOpen && <div onClick={onClose} className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"></div>}
    </>
  );
};

export default Sidebar;
