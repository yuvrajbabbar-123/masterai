import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { TypeOverEngine } from "@/components/TypeOverEngine";
import { ResultCard } from "@/pages/TypingPractice";
import { useAuth } from "@/context/AuthContext";
import { recordAttempt } from "@/lib/attempts";
import { ArrowLeft, CheckCircle, Confetti } from "@phosphor-icons/react";
import { Progress } from "@/components/ui/progress";

/**
 * Shared type-over lesson stepper used by Learn from Scratch and Learn from Documents.
 * props: title, subject, steps [{ group, lesson, concept, text }], backTo, backLabel, mode
 */
export function LessonRunner({ title, subject, steps, backTo, backLabel = "Back", mode = "learn" }) {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [step, setStep] = useState(0);
  const [result, setResult] = useState(null);

  const total = steps.length;
  const done = step >= total;
  const current = steps[step];

  const onComplete = async (stats) => {
    setResult(stats);
    await recordAttempt({
      mode, wpm: stats.wpm, accuracy: stats.accuracy, chars: stats.chars,
      concept: current.concept, subject, passed: stats.accuracy >= 80,
    }, refreshUser);
  };

  const next = () => { setResult(null); setStep((s) => s + 1); };
  const restart = () => { setResult(null); setStep(0); };

  return (
    <div className="min-h-[70vh] flex flex-col" data-testid="lesson-runner">
      <button onClick={() => navigate(backTo)} className="flex items-center gap-1.5 text-sm text-[#A3A3A3] hover:text-white transition-colors mb-6">
        <ArrowLeft size={16} /> {backLabel}
      </button>

      <div className="mb-2">
        <span className="text-[10px] font-mono-type uppercase tracking-widest text-[#EAB308]">{subject}</span>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
      </div>

      {!done && (
        <div className="mb-8">
          <div className="flex justify-between text-xs text-[#525252] font-mono-type mb-2">
            <span className="truncate mr-4">{current.group ? `${current.group} · ` : ""}{current.lesson}</span>
            <span className="tabular-nums shrink-0">{step + 1}/{total}</span>
          </div>
          <Progress value={(step / total) * 100} className="h-1.5 bg-[#171717]" />
        </div>
      )}

      <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full">
        {done ? (
          <div className="text-center fade-up" data-testid="runner-complete">
            <Confetti size={56} weight="duotone" className="text-[#EAB308] mx-auto" />
            <h2 className="font-display text-3xl font-black mt-4">Complete!</h2>
            <p className="text-[#A3A3A3] mt-2">You typed every passage in "{title}" into memory.</p>
            <div className="flex gap-3 justify-center mt-8">
              <button onClick={restart} className="px-6 py-3 rounded-full border border-white/10 hover:border-white/30 transition-colors font-semibold">Restart</button>
              <button onClick={() => navigate("/app/test")} className="px-6 py-3 rounded-full bg-[#EAB308] text-[#0A0A0A] font-bold hover:bg-[#FACC15] transition-colors">Test yourself</button>
            </div>
          </div>
        ) : result ? (
          <div>
            <div className="flex items-center gap-2 text-green-400 text-sm mb-4 justify-center font-mono-type">
              <CheckCircle weight="fill" /> {current.concept}
            </div>
            <ResultCard result={result} onRestart={next} label={step + 1 >= total ? "finish" : "next passage →"} />
          </div>
        ) : (
          <div>
            <p className="text-[#525252] text-xs font-mono-type uppercase tracking-widest mb-4">Type this to lock it in</p>
            <TypeOverEngine key={step} text={current.text} onComplete={onComplete} />
          </div>
        )}
      </div>
    </div>
  );
}

// Flatten a modules->lessons->blocks course into runner steps
export function courseToSteps(course) {
  const out = [];
  (course.modules || []).forEach((m) => {
    (m.lessons || []).forEach((l) => {
      (l.blocks || []).forEach((b) => out.push({ group: m.title, lesson: l.title, concept: l.concept, text: b }));
    });
  });
  return out;
}

// Flatten a document's lessons->blocks into runner steps
export function documentToSteps(docData) {
  const out = [];
  (docData.lessons || []).forEach((l) => {
    (l.blocks || []).forEach((b) => out.push({ group: null, lesson: l.title, concept: l.concept, text: b }));
  });
  return out;
}
