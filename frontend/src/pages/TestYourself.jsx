import { useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { recordAttempt } from "@/lib/attempts";
import { Exam, Sparkle, CheckCircle, XCircle, CircleNotch } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function TestYourself() {
  const { refreshUser } = useAuth();
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [shortText, setShortText] = useState({});
  const [grades, setGrades] = useState({});
  const [grading, setGrading] = useState({});

  const generate = async () => {
    if (!topic.trim()) return;
    setBusy(true); setQuiz(null); setSubmitted(false); setAnswers({}); setGrades({}); setShortText({});
    try {
      const res = await api.post("/ai/quiz", { topic });
      setQuiz(res.data);
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setBusy(false); }
  };

  const submitMcq = async () => {
    setSubmitted(true);
    const correct = quiz.mcq.filter((q, i) => answers[i] === q.correct_index).length;
    const acc = Math.round((correct / quiz.mcq.length) * 100);
    await recordAttempt({ mode: "quiz", accuracy: acc, wpm: 0, subject: topic, passed: acc >= 60 }, refreshUser);
    toast.success(`You scored ${correct}/${quiz.mcq.length}`);
  };

  const gradeShort = async (i, q) => {
    if (!shortText[i]?.trim()) return;
    setGrading((g) => ({ ...g, [i]: true }));
    try {
      const res = await api.post("/ai/grade-short", { question: q.question, answer: shortText[i], rubric: q.rubric });
      setGrades((g) => ({ ...g, [i]: res.data }));
      await recordAttempt({ mode: "quiz", accuracy: res.data.score, wpm: 0, concept: q.concept, subject: topic, passed: res.data.passed }, refreshUser);
    } catch (err) { toast.error("Grading failed"); }
    finally { setGrading((g) => ({ ...g, [i]: false })); }
  };

  return (
    <div className="space-y-8" data-testid="test-yourself">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight flex items-center gap-3">
          <Exam size={34} weight="duotone" className="text-[#EAB308]" /> Test Yourself
        </h1>
        <p className="text-[#A3A3A3] mt-2">MCQs and AI-graded short answers on anything you've learned.</p>
      </div>

      <div className="max-w-2xl flex flex-col sm:flex-row gap-3">
        <Input data-testid="quiz-topic-input" placeholder="Quiz me on…" value={topic}
          onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => e.key === "Enter" && generate()}
          className="bg-[#0A0A0A] border-white/10 h-12 text-base" />
        <Button onClick={generate} disabled={busy} data-testid="generate-quiz-button"
          className="h-12 px-6 bg-[#EAB308] text-[#0A0A0A] font-bold hover:bg-[#FACC15] shrink-0">
          {busy ? "Building…" : <><Sparkle weight="fill" size={18} className="mr-1" /> Generate</>}
        </Button>
      </div>

      {quiz && (
        <div className="max-w-3xl space-y-8 fade-up">
          {/* MCQ */}
          <section className="space-y-5">
            <h2 className="font-display text-xl font-bold">Multiple choice</h2>
            {quiz.mcq.map((q, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-[#171717] p-5" data-testid={`mcq-${i}`}>
                <p className="font-medium mb-4">{i + 1}. {q.question}</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {q.options.map((opt, oi) => {
                    const chosen = answers[i] === oi;
                    const isCorrect = q.correct_index === oi;
                    let cls = "border-white/10 hover:border-white/30";
                    if (submitted) {
                      if (isCorrect) cls = "border-green-500 bg-green-500/10";
                      else if (chosen) cls = "border-[#F43F5E] bg-[#F43F5E]/10";
                    } else if (chosen) cls = "border-[#EAB308] bg-[#EAB308]/10";
                    return (
                      <button key={oi} disabled={submitted}
                        onClick={() => setAnswers((a) => ({ ...a, [i]: oi }))}
                        data-testid={`mcq-${i}-opt-${oi}`}
                        className={`text-left text-sm px-4 py-3 rounded-xl border transition-colors flex items-center justify-between gap-2 ${cls}`}>
                        <span>{opt}</span>
                        {submitted && isCorrect && <CheckCircle weight="fill" className="text-green-500 shrink-0" />}
                        {submitted && chosen && !isCorrect && <XCircle weight="fill" className="text-[#F43F5E] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {!submitted && (
              <Button onClick={submitMcq} disabled={Object.keys(answers).length < quiz.mcq.length}
                data-testid="submit-mcq-button"
                className="bg-[#EAB308] text-[#0A0A0A] font-bold hover:bg-[#FACC15]">
                Submit answers
              </Button>
            )}
          </section>

          {/* Short answer */}
          <section className="space-y-5">
            <h2 className="font-display text-xl font-bold">Short answer</h2>
            <p className="text-sm text-[#A3A3A3] -mt-3">Write in your own words — graded by AI against a rubric.</p>
            {quiz.short.map((q, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-[#171717] p-5" data-testid={`short-${i}`}>
                <p className="font-medium mb-3">{q.question}</p>
                <Textarea value={shortText[i] || ""} onChange={(e) => setShortText((s) => ({ ...s, [i]: e.target.value }))}
                  placeholder="Your answer…" data-testid={`short-input-${i}`}
                  className="bg-[#0A0A0A] border-white/10 min-h-[90px]" disabled={!!grades[i]} />
                {grades[i] ? (
                  <div className={`mt-3 text-sm rounded-xl p-3 ${grades[i].passed ? "bg-green-500/10 text-green-300" : "bg-[#F43F5E]/10 text-red-300"}`}>
                    <span className="font-bold font-display">{grades[i].score}/100</span> — {grades[i].feedback}
                  </div>
                ) : (
                  <Button onClick={() => gradeShort(i, q)} disabled={grading[i] || !shortText[i]?.trim()}
                    data-testid={`grade-short-${i}`}
                    className="mt-3 h-9 bg-white/10 hover:bg-white/20 text-white">
                    {grading[i] ? <CircleNotch className="animate-spin" size={16} /> : "Grade my answer"}
                  </Button>
                )}
              </div>
            ))}
          </section>
        </div>
      )}
    </div>
  );
}
