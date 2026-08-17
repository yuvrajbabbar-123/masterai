import { useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { TypeOverEngine } from "@/components/TypeOverEngine";
import { ResultCard } from "@/pages/TypingPractice";
import { useAuth } from "@/context/AuthContext";
import { recordAttempt } from "@/lib/attempts";
import { ChatCircleDots, Sparkle } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AskAI() {
  const { refreshUser } = useAuth();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const ask = async () => {
    if (!question.trim()) return;
    setBusy(true); setAnswer(null); setResult(null);
    try {
      const res = await api.post("/ai/ask", { question });
      setAnswer(res.data.answer);
    } catch (err) {
      toast.error(err.response?.data?.detail || "AI failed");
    } finally { setBusy(false); }
  };

  const onComplete = async (stats) => {
    setResult(stats);
    await recordAttempt({ mode: "ask", wpm: stats.wpm, accuracy: stats.accuracy, chars: stats.chars, subject: "Ask AI", passed: stats.accuracy >= 80 }, refreshUser);
  };

  return (
    <div className="space-y-8" data-testid="ask-ai">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight flex items-center gap-3">
          <ChatCircleDots size={34} weight="duotone" className="text-[#EAB308]" /> Ask AI
        </h1>
        <p className="text-[#A3A3A3] mt-2">No copy-paste. The answer arrives as a type-over rep so it actually sticks.</p>
      </div>

      <div className="max-w-2xl flex flex-col sm:flex-row gap-3">
        <Input data-testid="question-input" placeholder="Ask anything…" value={question}
          onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask()}
          className="bg-[#0A0A0A] border-white/10 h-12 text-base" />
        <Button onClick={ask} disabled={busy} data-testid="ask-button"
          className="h-12 px-6 bg-[#EAB308] text-[#0A0A0A] font-bold hover:bg-[#FACC15] shrink-0">
          {busy ? "Thinking…" : <><Sparkle weight="fill" size={18} className="mr-1" /> Ask</>}
        </Button>
      </div>

      {answer && (
        <div className="max-w-4xl border-l-4 border-[#EAB308] pl-6 py-2 fade-up">
          {result ? (
            <ResultCard result={result} onRestart={() => { setResult(null); }} label="type again" />
          ) : (
            <>
              <p className="text-[#525252] text-xs font-mono-type uppercase tracking-widest mb-4">Type the answer</p>
              <TypeOverEngine key={answer} text={answer} onComplete={onComplete} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
