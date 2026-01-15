import { useState, useEffect, useMemo, useRef } from "react";
import {
  HeartPulseIcon,
  DocumentSearchIcon,
  DumbbellIcon,
  WaveformIcon,
  PlayCircleIcon,
  PauseCircleIcon,
} from "../../components/icons/iconslist";
import mayavoiceIntro from "../../assets/audio/mayain.mp3";

export default function MobileLandingContent({
  onContinue,
}: {
  onContinue: () => void;
}) {
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
    const phrase = phrases[phraseIndex];
    const timeout = setTimeout(() => {
      if (isDeleting) {
        setText((t) => t.slice(0, -1));
        if (text.length === 0) {
          setIsDeleting(false);
          setPhraseIndex((i) => (i + 1) % phrases.length);
        }
      } else {
        setText(phrase.slice(0, text.length + 1));
        if (text.length === phrase.length) {
          setTimeout(() => setIsDeleting(true), 1200);
        }
      }
    }, isDeleting ? 40 : 80);

    return () => clearTimeout(timeout);
  }, [text, isDeleting, phraseIndex, phrases]);

  const exampleQuestions = [
    "How can I manage my PCOS symptoms?",
    "Explain my recent lab report for me.",
    "What are the best exercises for my luteal phase?",
    "Suggest a meal plan for hormonal balance.",
  ];

  const [questionIndex, setQuestionIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(
      () => setQuestionIndex((i) => (i + 1) % exampleQuestions.length),
      3500
    );
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <audio ref={audioRef} src={mayavoiceIntro} />

      <h2 className="text-lg font-semibold text-[#0F172A]">
        Meet Maya, your{" "}
        <span className="text-indigo-600 inline-block min-w-[180px]">
          {text}
        </span>
        <span className="inline-block w-px h-4 bg-gray-400 ml-1 animate-pulse" />
      </h2>

      <button
        onClick={togglePlay}
        className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50"
      >
        {isPlaying ? (
          <PauseCircleIcon className="w-6 h-6 text-indigo-600" />
        ) : (
          <PlayCircleIcon className="w-6 h-6 text-indigo-600" />
        )}
        <div>
          <div className="font-semibold text-indigo-800">
            Hear from Maya
          </div>
          <div className="text-xs text-indigo-600">
            Listen to a quick introduction.
          </div>
        </div>
      </button>

      <h3 className="text-sm font-medium text-[#0F172A] mt-2">
        What Maya can help with :
      </h3>

      <div className="bg-[#F7F7FB] rounded-2xl p-4 space-y-3">
        <Feature icon={<HeartPulseIcon />} title="Expert Health insights" />
        <Feature icon={<DocumentSearchIcon />} title="Analyze Medical Reports" />
        <Feature icon={<DumbbellIcon />} title="Personalized Wellness" />
        <Feature icon={<WaveformIcon />} title="Natural Voice Conversations" />
      </div>

      <input
        disabled
        value={exampleQuestions[questionIndex]}
        className="border rounded-full px-4 py-3 text-sm text-gray-500"
      />

      <button
        onClick={onContinue}
        className="rounded-xl py-3 bg-[#1B2245] text-white font-medium"
      >
        Login / sign up
      </button>
    </div>
  );
}

function Feature({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="bg-indigo-100 p-2 rounded-full text-indigo-600">
        {icon}
      </div>
      <div className="text-sm font-semibold">{title}</div>
    </div>
  );
}
