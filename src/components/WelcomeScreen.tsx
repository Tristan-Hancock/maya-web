
import React from 'react';

const WelcomeScreen: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
        <h1 className="text-8xl font-extrabold text-[#191D38]">Ovelia</h1>
        <p className="text-2xl text-gray-600 mt-4">Hey, I'm Maya!</p>
    </div>
  );
};

export default WelcomeScreen;
