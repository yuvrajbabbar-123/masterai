import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import { GraduationCap, Sparkle, ArrowRight, BookOpen } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const SUGGESTIONS = ["Basics of Photosynthesis", "How Blockchain works", "French greetings", "The French Revolution", "Intro to Machine Learning"];

export default function LearnScratch() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [courses, setCourses] = useState([]);

  const loadCourses = async () => {
    try { const res = await api.get("/courses"); setCourses(res.data); } catch {}
  };
  useEffect(() => { loadCourses(); }, []);

  const generate = async (t) => {
    const value = (t || topic).trim();
    if (!value) return;
    setBusy(true);
    try {
      const res = await api.post("/ai/course", { topic: value });
      toast.success("Course ready!");
      navigate(`/app/learn/${res.data.course_id}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Generation failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-10" data-testid="learn-scratch">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight flex items-center gap-3">
          <GraduationCap size={34} weight="duotone" className="text-[#EAB308]" /> Learn from Scratch
        </h1>
        <p className="text-[#A3A3A3] mt-2">Name any topic. AI builds a micro-course — then you type it into memory.</p>
      </div>

      <div className="max-w-2xl rounded-2xl border border-white/10 bg-[#171717] p-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <Input data-testid="topic-input" placeholder="What do you want to learn?" value={topic}
            onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => e.key === "Enter" && generate()}
            className="bg-[#0A0A0A] border-white/10 h-12 text-base" />
          <Button onClick={() => generate()} disabled={busy} data-testid="generate-course-button"
            className="h-12 px-6 bg-[#EAB308] text-[#0A0A0A] font-bold hover:bg-[#FACC15] shrink-0">
            {busy ? "Building…" : <><Sparkle weight="fill" size={18} className="mr-1" /> Generate</>}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => { setTopic(s); generate(s); }} disabled={busy}
              className="text-xs px-3 py-1.5 rounded-full border border-white/10 text-[#A3A3A3] hover:border-[#EAB308] hover:text-[#EAB308] transition-colors">
              {s}
            </button>
          ))}
        </div>
      </div>

      {courses.length > 0 && (
        <div>
          <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2"><BookOpen size={22} /> Your Courses</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((c) => (
              <button key={c.course_id} onClick={() => navigate(`/app/learn/${c.course_id}`)}
                data-testid={`course-${c.course_id}`}
                className="group text-left rounded-2xl border border-white/10 bg-[#171717] p-5 hover:-translate-y-1 hover:border-white/20 transition-transform">
                <span className="text-[10px] font-mono-type uppercase tracking-widest text-[#EAB308]">{c.subject || c.level}</span>
                <h3 className="font-display font-bold text-lg mt-2 leading-tight">{c.title}</h3>
                <p className="text-sm text-[#A3A3A3] mt-1 line-clamp-2">{c.description}</p>
                <div className="flex items-center gap-1 text-xs text-[#525252] mt-4 group-hover:text-white transition-colors">
                  Start <ArrowRight size={14} />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
