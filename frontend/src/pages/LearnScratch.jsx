import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import { GraduationCap, Sparkle, ArrowRight, BookOpen, Trash, CheckCircle, Crown, Plus, Stack } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const MASTER_STAGE = 10;
const SUGGESTIONS = ["Basics of Photosynthesis", "How Blockchain works", "French greetings", "The French Revolution", "Intro to Machine Learning"];

export default function LearnScratch() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [courses, setCourses] = useState([]);
  const [nextBusy, setNextBusy] = useState(null);

  const loadCourses = async () => {
    try { const res = await api.get("/courses"); setCourses(res.data); } catch {}
  };
  useEffect(() => { loadCourses(); }, []);

  const deleteCourse = async (id) => {
    try {
      await api.delete(`/courses/${id}`);
      setCourses((cs) => cs.filter((c) => c.course_id !== id));
      toast.success("Course deleted");
    } catch { toast.error("Delete failed"); }
  };

  const nextStage = async (c) => {
    const known = (c.modules || []).flatMap((m) => (m.lessons || []).map((l) => l.concept)).filter(Boolean);
    setNextBusy(c.course_id);
    try {
      const res = await api.post("/ai/course", {
        topic: c.topic || c.title, known_concepts: known,
        journey_id: c.journey_id, stage: (c.stage || 1) + 1,
      });
      toast.success(`Stage ${(c.stage || 1) + 1} ready!`);
      navigate(`/app/learn/${res.data.course_id}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not build next stage");
    } finally { setNextBusy(null); }
  };

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
            {courses.map((c) => {
              const stage = c.stage || 1;
              const isMaster = stage >= MASTER_STAGE;
              return (
                <div key={c.course_id} data-testid={`course-${c.course_id}`}
                  className="group relative rounded-2xl border border-white/10 bg-[#171717] p-5 hover:border-white/20 transition-colors flex flex-col">
                  {/* top row: stage + delete */}
                  <div className="flex items-center justify-between mb-2">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-mono-type uppercase tracking-widest px-2 py-1 rounded-full ${isMaster ? "bg-[#EAB308] text-[#0A0A0A]" : "bg-white/5 text-[#EAB308]"}`} data-testid={`course-stage-${c.course_id}`}>
                      {isMaster ? <Crown size={12} weight="fill" /> : <Stack size={12} weight="bold" />}
                      {isMaster ? "Master" : `Stage ${stage}`}
                    </span>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button data-testid={`delete-course-${c.course_id}`} onClick={(e) => e.stopPropagation()}
                          className="text-[#525252] hover:text-[#F43F5E] transition-colors p-1">
                          <Trash size={16} />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-[#171717] border-white/10">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this course?</AlertDialogTitle>
                          <AlertDialogDescription>"{c.title}" and its progress will be permanently removed.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-transparent border-white/10">Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteCourse(c.course_id)} data-testid={`confirm-delete-${c.course_id}`}
                            className="bg-[#F43F5E] text-white hover:bg-[#e11d48]">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  <button onClick={() => navigate(`/app/learn/${c.course_id}`)} className="text-left flex-1">
                    <h3 className="font-display font-bold text-lg leading-tight">{c.title}</h3>
                    <p className="text-sm text-[#A3A3A3] mt-1 line-clamp-2">{c.description}</p>
                    {c.completed && (
                      <span className="inline-flex items-center gap-1 text-xs text-green-400 mt-3">
                        <CheckCircle size={14} weight="fill" /> Completed
                      </span>
                    )}
                  </button>

                  {/* actions */}
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
                    <button onClick={() => navigate(`/app/learn/${c.course_id}`)} data-testid={`open-course-${c.course_id}`}
                      className="flex-1 flex items-center justify-center gap-1 text-sm py-2 rounded-lg border border-white/10 text-[#A3A3A3] hover:text-white hover:border-white/30 transition-colors">
                      {c.completed ? "Redo" : "Continue"} <ArrowRight size={14} />
                    </button>
                    <button onClick={() => nextStage(c)} disabled={nextBusy === c.course_id} data-testid={`next-stage-${c.course_id}`}
                      className="flex-1 flex items-center justify-center gap-1 text-sm py-2 rounded-lg bg-[#EAB308] text-[#0A0A0A] font-bold hover:bg-[#FACC15] transition-colors disabled:opacity-50">
                      {nextBusy === c.course_id ? "…" : <>Next stage <Plus size={13} weight="bold" /></>}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
