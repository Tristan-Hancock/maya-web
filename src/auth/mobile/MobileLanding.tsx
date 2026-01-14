import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  HeartPulseIcon,
  DocumentSearchIcon,
  DumbbellIcon,
  WaveformIcon,
  PlayCircleIcon,
  PauseCircleIcon,
} from "../../components/icons/iconslist";
import mayavoiceIntro from "../../assets/audio/mayain.mp3";

export default function MobileLanding({
  onContinue,
}: {
  onContinue: () => void;
}) {
  /* ------------------ AUDIO ------------------ */
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = async () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    } else {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (err) {
        console.error("Audio play failed:", err);
      }
    }
  };

  /* ------------------ TYPING TEXT ------------------ */
  const phrases = useMemo(
    () => [
      "personal health companion.",
      "wellness partner.",
      "fitness guide.",
      "trusted confidante.",
    ],
    []
  );

  const [text, setText] = useState("");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const typeSpeed = 90;
    const deleteSpeed = 45;
    const pauseDuration = 1600;

    const currentPhrase = phrases[phraseIndex];

    const timeout = setTimeout(() => {
      if (isDeleting) {
        if (text.length > 0) {
          setText((t) => t.slice(0, -1));
        } else {
          setIsDeleting(false);
          setPhraseIndex((i) => (i + 1) % phrases.length);
        }
      } else {
        if (text.length < currentPhrase.length) {
          setText(currentPhrase.slice(0, text.length + 1));
        } else {
          setTimeout(() => setIsDeleting(true), pauseDuration);
        }
      }
    }, isDeleting ? deleteSpeed : typeSpeed);

    return () => clearTimeout(timeout);
  }, [text, isDeleting, phraseIndex, phrases]);

  /* ------------------ ROTATING QUESTIONS ------------------ */
  const exampleQuestions = useMemo(
    () => [
      "How can I manage my PCOS symptoms?",
      "Explain my recent lab report for me.",
      "What are the best exercises for my luteal phase?",
      "Suggest a meal plan for hormonal balance.",
    ],
    []
  );

  const [questionIndex, setQuestionIndex] = useState(0);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(true);
      setTimeout(() => {
        setQuestionIndex((i) => (i + 1) % exampleQuestions.length);
        setFade(false);
      }, 400);
    }, 3500);

    return () => clearInterval(interval);
  }, [exampleQuestions.length]);

  /* ------------------ UI ------------------ */
  return (
    <div className="min-h-screen flex flex-col bg-[linear-gradient(#EDEEFF,#FFFFFF)]">
      {/* Hidden audio element (mobile-safe) */}
      <audio
        ref={audioRef}
        src={mayavoiceIntro}
        onEnded={() => setIsPlaying(false)}
        preload="auto"
      />

      {/* Brand */}
      <div className="text-center pt-10 pb-6">
        <h1 className="text-4xl font-extrabold text-[#1B2245]">Ovelia</h1>
      </div>

      {/* Bottom sheet */}
      <div className="flex-1 bg-white rounded-t-[32px] px-6 pt-8 shadow-xl">
        <h2 className="text-lg font-semibold leading-snug">
          Meet Maya, your{" "}
          <span className="text-indigo-600 font-semibold">{text}</span>
          <span className="inline-block w-px h-4 bg-gray-400 ml-1 animate-pulse" />
        </h2>

        {/* Audio CTA */}
        <button
          onClick={togglePlay}
          className="flex items-center gap-3 mt-5 p-3 rounded-xl bg-indigo-50 w-full"
        >
          {isPlaying ? (
            <PauseCircleIcon className="w-6 h-6 text-indigo-600" />
          ) : (
            <PlayCircleIcon className="w-6 h-6 text-indigo-600" />
          )}
          <div className="text-left">
            <div className="font-medium text-indigo-800">
              Hear from Maya
            </div>
            <div className="text-xs text-indigo-600">
              Listen to a quick introduction.
            </div>
          </div>
        </button>

        {/* Features */}
        <div className="mt-6 space-y-4">
          <Feature icon={<HeartPulseIcon />} title="Expert Health insights" />
          <Feature icon={<DocumentSearchIcon />} title="Analyze Medical Reports" />
          <Feature icon={<DumbbellIcon />} title="Personalized Wellness" />
          <Feature icon={<WaveformIcon />} title="Natural Voice Conversations" />
        </div>

        {/* Rotating question */}
        <div className="mt-6 relative">
          <input
            disabled
            className="w-full border rounded-full p-3 text-sm text-gray-500"
            value={exampleQuestions[questionIndex]}
            style={{
              opacity: fade ? 0 : 1,
              transition: "opacity 0.4s ease",
            }}
          />
        </div>

        {/* CTA */}
        <button
          onClick={onContinue}
          className="mt-6 w-full rounded-xl p-4 bg-[#1B2245] text-white"
        >
          Login / sign up
        </button>

        {/* Footer */}
        <p className="text-xs text-center text-gray-500 mt-4">
          Maya can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}

function Feature({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="bg-indigo-100 p-2 rounded-full text-indigo-600">
        {icon}
      </div>
      <div className="text-sm font-medium">{title}</div>
    </div>
  );
}
