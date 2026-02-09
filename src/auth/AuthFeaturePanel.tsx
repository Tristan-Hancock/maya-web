import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  HeartPulseIcon,
  DocumentSearchIcon,
  DumbbellIcon,
  WaveformIcon,
  PlayCircleIcon,
  PauseCircleIcon,
//   SparklesIcon,
} from '../components/icons/iconslist';
import mayavoiceIntro from '../assets/audio/mayain.mp3';
// --- Audio Utilities ---
//call the recorded audio file 




// --- Feature Panel Component ---
const AuthFeaturePanel: React.FC = () => {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceRef = useRef<AudioBufferSourceNode | null>(null);
    const audioBufferRef = useRef<AudioBuffer | null>(null);
    const audioClosedRef = useRef(false);
    const safeCloseAudioContext = async () => {
      const ctx = audioContextRef.current;
      if (!ctx || audioClosedRef.current) return;
    
      audioClosedRef.current = true;
      await ctx.close();
      audioContextRef.current = null;
    };
    
    // Typing animation state
    const phrases = useMemo(() => [
        'personal health companion.',
        'wellness partner.',
        'fitness guide.',
        'trusted confidante.',
    ], []);
    const [phraseIndex, setPhraseIndex] = useState(0);
    const [text, setText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    // Dynamic questions state
    const exampleQuestions = useMemo(() => [
        "How can I manage my PCOS symptoms?",
        "Explain my recent lab report for me.",
        "What are the best exercises for my luteal phase?",
        "Suggest a meal plan for hormonal balance."
    ], []);
    const [questionIndex, setQuestionIndex] = useState(0);
    const [isFading, setIsFading] = useState(false);


    useEffect(() => {
        const typeSpeed = 100;
        const deleteSpeed = 50;
        const pauseDuration = 2000;

        const handleTyping = () => {
            const currentPhrase = phrases[phraseIndex];
            if (isDeleting) {
                if (text.length > 0) {
                    setText(t => t.slice(0, -1));
                } else {
                    setIsDeleting(false);
                    setPhraseIndex(prev => (prev + 1) % phrases.length);
                }
            } else {
                if (text.length < currentPhrase.length) {
                    setText(t => currentPhrase.slice(0, t.length + 1));
                } else {
                    setTimeout(() => setIsDeleting(true), pauseDuration);
                }
            }
        };
        
        const timeout = setTimeout(handleTyping, isDeleting ? deleteSpeed : typeSpeed);
        return () => clearTimeout(timeout);

    }, [text, isDeleting, phraseIndex, phrases]);

// --- Add this useEffect below your typing effect ---
useEffect(() => {
  const initAudio = async () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = ctx;

      const response = await fetch(mayavoiceIntro);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = await ctx.decodeAudioData(arrayBuffer);
      audioBufferRef.current = buffer;
    } catch (err) {
      console.error("Failed to load Maya intro audio:", err);
    }
  };
  initAudio();
  return () => {
    safeCloseAudioContext();

  };
}, []);




    useEffect(() => {
        // Initialize AudioContext
       

        const questionInterval = setInterval(() => {
            setIsFading(true);
            setTimeout(() => {
                setQuestionIndex(prevIndex => (prevIndex + 1) % exampleQuestions.length);
                setIsFading(false);
            }, 500); // must match fade-out duration
        }, 4000); // How long each question is displayed

        return () => { 
          safeCloseAudioContext();
             clearInterval(questionInterval);
        }
    }, [exampleQuestions.length]);

    const togglePlay = async () => {
      const audioContext = audioContextRef.current;
      if (!audioContext || !audioBufferRef.current) return;
    
      // Stop if already playing
      if (isPlaying && sourceRef.current) {
        sourceRef.current.stop();
        sourceRef.current.disconnect();
        sourceRef.current = null;
        setIsPlaying(false);
        return;
      }
    
      // Resume context if suspended (browser policy)
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }
    
      // Create and start new source
      const source = audioContext.createBufferSource();
      source.buffer = audioBufferRef.current;
      source.connect(audioContext.destination);
      source.start(0);
    
      setIsPlaying(true);
      source.onended = () => {
        setIsPlaying(false);
        sourceRef.current = null;
      };
      sourceRef.current = source;
    };
    

  return (
    <div className="hidden md:flex flex-col p-8 md:p-12 lg:p-16 bg-white h-full">
      <div>
        <h1 className="text-6xl font-extrabold text-brand-dark">Ovelia</h1>
        <p className="mt-4 text-xl text-gray-600 max-w-md h-8">
          Meet Maya, your{' '}
          <span className="text-indigo-600 font-semibold">{text}</span>
          <span className="inline-block w-px h-6 bg-gray-600 ml-1 opacity-75 animate-pulse" aria-hidden="true"></span>
        </p>
        
        <button 
          onClick={togglePlay}
          className="flex items-center gap-3 mt-8 text-left p-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors group"
        >
          {isPlaying ? <PauseCircleIcon className="w-8 h-8 text-indigo-600 flex-shrink-0" /> : <PlayCircleIcon className="w-8 h-8 text-indigo-600 flex-shrink-0" />}
          <div>
              <h3 className="font-semibold text-indigo-800">Hear from Maya</h3>
              <p className="text-sm text-indigo-600">Listen to a quick introduction.</p>
          </div>
        </button>

        <div className="mt-10 space-y-6">
          <FeatureItem
            icon={<HeartPulseIcon className="w-6 h-6 text-indigo-600" />}
            title="Expert Health Insights"
            description="Get clear, empathetic answers about PCOS, menstrual health, and fitness."
          />
          <FeatureItem
            icon={<DocumentSearchIcon className="w-6 h-6 text-indigo-600" />}
            title="Analyze Medical Reports"
            description="Upload prescriptions or lab results to get summaries and explanations."
          />
          <FeatureItem
            icon={<DumbbellIcon className="w-6 h-6 text-indigo-600" />}
            title="Personalized Wellness"
            description="Receive guidance on fitness and nutrition tailored to your needs."
          />
          <FeatureItem
            icon={<WaveformIcon className="w-6 h-6 text-indigo-600" />}
            title="Natural Voice Conversations"
            description="Speak with Maya naturally and listen to her helpful responses."
          />
        </div>
      </div>

      <div className="mt-auto pt-8">
        <div className="relative flex items-center w-full bg-white rounded-full shadow-lg border border-gray-200 py-3 px-4">
            {/* <SparklesIcon className="w-6 h-6 text-indigo-500 flex-shrink-0" /> */}
            <div className="flex-1 ml-3 h-6 relative overflow-hidden">
                <p className={`absolute inset-0 text-gray-500 transition-opacity duration-500 ease-in-out ${isFading ? 'opacity-0' : 'opacity-100'}`}>
                    {exampleQuestions[questionIndex]}
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};


const FeatureItem: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
  <div className="flex items-start gap-4">
    <div className="bg-indigo-100 p-2 rounded-full flex-shrink-0">
      {icon}
    </div>
    <div>
      <h3 className="font-semibold text-brand-dark">{title}</h3>
      <p className="text-gray-500">{description}</p>
    </div>
  </div>
);


export default AuthFeaturePanel;