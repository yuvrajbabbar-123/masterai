import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { TypeOverEngine } from "@/components/TypeOverEngine";
import { ResultCard } from "@/pages/TypingPractice";
import { useAuth } from "@/context/AuthContext";
import { recordAttempt } from "@/lib/attempts";
import { ArrowLeft, CheckCircle, Confetti } from "@phosphor-icons/react";
import { Progress } from "@/components/ui/progress";

export default function CourseView() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [course, setCourse] = useState(null);
  const [step, setStep] = useState(0);
  const [result, setResult] = useState(null);

  useEffect(() => {
    api.get(`/courses/${courseId}`).then((r) => setCourse(r.data)).catch(() => navigate("/app/learn"));
  }, [courseId, navigate]);

  const steps = useMemo(() => {
    if (!course) return [];
    const out = [];
    (course.modules || []).forEach((m) => {
      (m.lessons || []).forEach((l) => {
        (l.blocks || []).forEach((b) => {
          out.push({ module: m.title, lesson: l.title, concept: l.concept, text: b });
        });
      });
    });
    return out;
  }, [course]);

  if (!course) return <div className="text-[#525252] font-mono-type animate-pulse">loading course…</div>;

  const done = step >= steps.length;
  const current = steps[step];

  const onComplete = async (stats) => {
    setResult(stats);
    await recordAttempt({
      mode: "learn", wpm: stats.wpm, accuracy: stats.accuracy, chars: stats.chars,
      concept: current.concept, subject: course.subject || course.topic,
      passed: stats.accuracy >= 80,
    }, refreshUser);
  };

  const next = () => { setResult(null); setStep((s) => s + 1); };

  return (
    <div className="min-h-[70vh] flex flex-col" data-testid="course-view">
      <button onClick={() => navigate("/app/learn")} className="flex items-center gap-1.5 text-sm text-[#A3A3A3] hover:text-white transition-colors mb-6">
        <ArrowLeft size={16} /> Courses
      </button>

      <div className="mb-2">
        <span className="text-[10px] font-mono-type uppercase tracking-widest text-[#EAB308]">{course.subject}</span>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">{course.title}</h1>
      </div>

      {!done && (
        <div className="mb-8">
          <div className="flex justify-between text-xs text-[#525252] font-mono-type mb-2">
            <span>{current.module} · {current.lesson}</span>
            <span>{step + 1}/{steps.length}</span>
          </div>
          <Progress value={((step) / steps.length) * 100} className="h-1.5 bg-[#171717]" />
        </div>
      )}

      <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full">
        {done ? (
          <div className="text-center fade-up" data-testid="course-complete">
            <Confetti size={56} weight="duotone" className="text-[#EAB308] mx-auto" />
            <h2 className="font-display text-3xl font-black mt-4">Course complete!</h2>
            <p className="text-[#A3A3A3] mt-2">You typed every concept in "{course.title}" into memory.</p>
            <div className="flex gap-3 justify-center mt-8">
              <button onClick={() => { setStep(0); setResult(null); }} className="px-6 py-3 rounded-full border border-white/10 hover:border-white/30 transition-colors font-semibold">Restart</button>
              <button onClick={() => navigate("/app/test")} className="px-6 py-3 rounded-full bg-[#EAB308] text-[#0A0A0A] font-bold hover:bg-[#FACC15] transition-colors">Test yourself</button>
            </div>
          </div>
        ) : result ? (
          <div>
            <div className="flex items-center gap-2 text-green-400 text-sm mb-4 justify-center font-mono-type">
              <CheckCircle weight="fill" /> {current.concept}
            </div>
            <ResultCard result={result} onRestart={next} label={step + 1 >= steps.length ? "finish" : "next block →"} />
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
