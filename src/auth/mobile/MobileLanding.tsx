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
      await audioRef.current.play();
      setIsPlaying(true);
    }
  };

  /* ------------------ TYPING TEXT ------------------ */
  const phrases = useMemo(
    () => [
      "health companion.",
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
    const timeout = setTimeout(() => {
      const phrase = phrases[phraseIndex];
      if (isDeleting) {
        setText((t) => t.slice(0, -1));
        if (text.length === 0) {
          setIsDeleting(false);
          setPhraseIndex((i) => (i + 1) % phrases.length);
        }
      } else {
        setText(phrase.slice(0, text.length + 1));
        if (text.length === phrase.length) {
          setTimeout(() => setIsDeleting(true), 1300);
        }
      }
    }, isDeleting ? 40 : 80);

    return () => clearTimeout(timeout);
  }, [text, isDeleting, phraseIndex, phrases]);

  /* ------------------ QUESTIONS ------------------ */
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

  useEffect(() => {
    const interval = setInterval(
      () => setQuestionIndex((i) => (i + 1) % exampleQuestions.length),
      3500
    );
    return () => clearInterval(interval);
  }, [exampleQuestions.length]);

  /* ------------------ UI ------------------ */
  return (
    <div className="min-h-screen flex flex-col bg-[linear-gradient(#EDEEFF,#FFFFFF)]">
      <audio ref={audioRef} src={mayavoiceIntro} onEnded={() => setIsPlaying(false)} />

      {/* Brand */}
      <div className="text-center pt-8 pb-6">
        <h1
          className="font-extrabold text-[#1B2245]"
          style={{
            fontFamily: "Inter",
            fontSize: "55px",
            lineHeight: "24px",
          }}
        >
          Ovelia
        </h1>
      </div>

      {/* Sheet */}
      <div className="flex-1 bg-white rounded-t-[32px] px-6 pt-6 shadow-xl">
        <h2 className="text-lg font-semibold leading-snug text-[#0F172A]">
          Meet Maya, your{" "}
          <span
            className="text-indigo-600 inline-block"
            style={{ minWidth: "170px", whiteSpace: "nowrap" }}
          >
            {text}
          </span>
          <span className="inline-block w-px h-4 bg-gray-400 ml-1 animate-pulse" />
        </h2>

        {/* Audio CTA */}
        <button
          onClick={togglePlay}
          className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-indigo-50 w-full"
        >
          {isPlaying ? (
            <PauseCircleIcon className="w-6 h-6 text-indigo-600" />
          ) : (
            <PlayCircleIcon className="w-6 h-6 text-indigo-600" />
          )}
          <div className="text-left">
            <div className="font-semibold text-indigo-800">
              Hear from Maya
            </div>
            <div className="text-xs text-indigo-600">
              Listen to a quick introduction.
            </div>
          </div>
        </button>

        {/* Section title */}
        <h3 className="mt-6 mb-3 font-medium text-sm text-[#0F172A]">
          What Maya can help with :
        </h3>

        {/* Feature card */}
        <div className="bg-[#F7F7FB] rounded-2xl p-4 space-y-3">
          <Feature
            icon={<HeartPulseIcon />}
            title="Expert Health insights"
            desc="Get clear, empathetic answers about PCOS, menstrual health, and fitness."
          />
          <Feature
            icon={<DocumentSearchIcon />}
            title="Analyze Medical Reports"
            desc="Upload prescriptions or lab results to get summaries and explanations."
          />
          <Feature
            icon={<DumbbellIcon />}
            title="Personalized Wellness"
            desc="Receive guidance on fitness and nutrition tailored to your needs."
          />
          <Feature
            icon={<WaveformIcon />}
            title="Natural Voice Conversations"
            desc="Speak with Maya naturally and listen to her helpful responses."
          />
        </div>

        {/* Input preview */}
        <input
          disabled
          value={exampleQuestions[questionIndex]}
          className="mt-4 w-full border rounded-full px-4 py-3 text-sm text-gray-500"
        />

        {/* CTA */}
        <button
          onClick={onContinue}
          className="mt-5 w-full rounded-xl py-3 bg-[#1B2245] text-white font-medium"
        >
          Login / sign up
        </button>

        {/* Footer */}
        <p className="text-[11px] text-center text-gray-500 mt-4">
          Maya can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="bg-indigo-100 p-2 rounded-full text-indigo-600">
        {icon}
      </div>
      <div>
        <div className="font-semibold text-sm text-[#0F172A]">
          {title}
        </div>
        <div className="text-xs text-gray-600 leading-snug">
          {desc}
        </div>
      </div>
    </div>
  );
}
