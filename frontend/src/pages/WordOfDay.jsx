import { useState, useEffect } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { TypeOverEngine } from "@/components/TypeOverEngine";
import { useAuth } from "@/context/AuthContext";
import { recordAttempt } from "@/lib/attempts";
import { Sparkle, ArrowRight, CheckCircle, PencilSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function WordOfDay() {
  const { refreshUser } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState("intro"); // intro | examples | write | done
  const [exIdx, setExIdx] = useState(0);
  const [exDone, setExDone] = useState(false);
  const [sentence, setSentence] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [grade, setGrade] = useState(null);
  const [grading, setGrading] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const res = await api.get("/ai/word-of-day"); setData(res.data); }
    catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  if (loading) return <div className="text-[#525252] font-mono-type animate-pulse">summoning today's word…</div>;
  if (!data) return <div className="text-[#A3A3A3]">Could not load. <button onClick={load} className="text-[#EAB308] underline">Retry</button></div>;

  const nextExample = () => {
    setExDone(false);
    if (exIdx + 1 < data.examples.length) setExIdx((i) => i + 1);
    else setPhase("write");
  };

  const submitSentence = async () => {
    if (!sentence.trim()) return;
    setGrading(true);
    try {
      const res = await api.post("/ai/grade-sentence", { word: data.word, sentence });
      setGrade(res.data);
      setAttempts((a) => a + 1);
      if (res.data.passed) {
        await recordAttempt({ mode: "word_of_day", accuracy: res.data.score, wpm: 0, concept: data.word, subject: "Vocabulary", passed: true }, refreshUser);
        setPhase("done");
      } else if (attempts + 1 >= 3) {
        toast("Out of attempts — try again tomorrow!");
        setPhase("done");
      }
    } catch { toast.error("Grading failed"); }
    finally { setGrading(false); }
  };

  return (
    <div className="space-y-8 max-w-3xl" data-testid="word-of-day">
      <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight flex items-center gap-3">
        <Sparkle size={34} weight="duotone" className="text-[#EAB308]" /> Word of the Day
      </h1>

      {/* Word card */}
      <div className="rounded-2xl border border-white/10 bg-[#171717] p-8">
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="font-display text-4xl font-black text-[#EAB308]">{data.word}</span>
          <span className="text-sm font-mono-type text-[#525252] italic">{data.part_of_speech}</span>
        </div>
        <p className="text-[#E5E5E5] mt-3 text-lg">{data.meaning}</p>
      </div>

      {phase === "intro" && (
        <Button onClick={() => setPhase("examples")} data-testid="start-word-button"
          className="bg-[#EAB308] text-[#0A0A0A] font-bold hover:bg-[#FACC15] h-11 px-6">
          Practice the examples <ArrowRight className="ml-1" weight="bold" />
        </Button>
      )}

      {phase === "examples" && (
        <div className="fade-up" data-testid="example-step">
          <p className="text-[#525252] text-xs font-mono-type uppercase tracking-widest mb-4">
            Example {exIdx + 1} of {data.examples.length} — type it exactly
          </p>
          <TypeOverEngine key={exIdx} text={data.examples[exIdx]} onComplete={() => setExDone(true)} />
          <Button onClick={nextExample} disabled={!exDone} data-testid="next-example-button"
            className="mt-8 bg-[#EAB308] text-[#0A0A0A] font-bold hover:bg-[#FACC15] disabled:opacity-40 h-11 px-6">
            {exIdx + 1 < data.examples.length ? "Next example" : "Write your own"} <ArrowRight className="ml-1" weight="bold" />
          </Button>
        </div>
      )}

      {phase === "write" && (
        <div className="fade-up space-y-4" data-testid="write-own-step">
          <h2 className="font-display text-xl font-bold flex items-center gap-2"><PencilSimple weight="bold" /> Now write your own sentence using "{data.word}"</h2>
          <Textarea value={sentence} onChange={(e) => setSentence(e.target.value)}
            placeholder={`Use "${data.word}" in a sentence…`} data-testid="own-sentence-input"
            className="bg-[#0A0A0A] border-white/10 min-h-[100px] text-base" />
          {grade && !grade.passed && (
            <div className="text-sm rounded-xl p-3 bg-[#F43F5E]/10 text-red-300" data-testid="sentence-feedback">
              {grade.feedback} <span className="text-[#525252]">({3 - attempts} attempts left)</span>
            </div>
          )}
          <Button onClick={submitSentence} disabled={grading || !sentence.trim()} data-testid="submit-sentence-button"
            className="bg-[#EAB308] text-[#0A0A0A] font-bold hover:bg-[#FACC15] h-11 px-6">
            {grading ? "Grading…" : "Submit sentence"}
          </Button>
        </div>
      )}

      {phase === "done" && (
        <div className="fade-up text-center py-8" data-testid="word-done">
          <CheckCircle size={52} weight="fill" className="text-green-500 mx-auto" />
          <h2 className="font-display text-2xl font-black mt-4">
            {grade?.passed ? "Nailed it! +10 Vocab Points" : "Come back tomorrow!"}
          </h2>
          {grade?.passed && <p className="text-[#A3A3A3] mt-2">{grade.feedback}</p>}
        </div>
      )}
    </div>
  );
}
