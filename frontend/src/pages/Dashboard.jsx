import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  Keyboard, GraduationCap, ChatCircleDots, Exam, Sparkle, Trophy,
  Flame, Lightning, ArrowRight, Target,
} from "@phosphor-icons/react";

const MODES = [
  { to: "/app/typing", title: "Typing Practice", desc: "Pure monkeytype reps. Free & unlimited.", icon: Keyboard, span: "lg:col-span-6", accent: true },
  { to: "/app/learn", title: "Learn from Scratch", desc: "AI builds a course. You type it into memory.", icon: GraduationCap, span: "lg:col-span-6" },
  { to: "/app/ask", title: "Ask AI", desc: "Answers you type, not paste.", icon: ChatCircleDots, span: "lg:col-span-4" },
  { to: "/app/test", title: "Test Yourself", desc: "MCQ + AI-graded short answers.", icon: Exam, span: "lg:col-span-4" },
  { to: "/app/word", title: "Word of the Day", desc: "Grow your vocabulary daily.", icon: Sparkle, span: "lg:col-span-4" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-8" data-testid="dashboard">
      <div className="fade-up">
        <p className="text-[#525252] font-mono-type text-sm uppercase tracking-widest">Welcome back</p>
        <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tighter mt-1">{user?.name?.split(" ")[0] || "Learner"}.</h1>
        <p className="text-[#A3A3A3] mt-2">Learn with AI. Master without it — one keystroke at a time.</p>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 fade-up" style={{ animationDelay: "80ms" }}>
        <StatCard icon={Lightning} color="#EAB308" label="Total XP" value={user?.xp || 0} testid="stat-xp" />
        <StatCard icon={Flame} color="#F97316" label="Day Streak" value={user?.streak || 0} testid="stat-streak" />
        <StatCard icon={Target} color="#22C55E" label="Level" value={user?.learning_level} testid="stat-level" />
        <StatCard icon={Trophy} color="#A855F7" label="Vocab Pts" value={user?.vocab_points || 0} testid="stat-vocab" />
      </div>

      {/* Mode bento */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
        {MODES.map((m, i) => (
          <button
            key={m.to}
            onClick={() => navigate(m.to)}
            data-testid={`mode-card-${m.title.toLowerCase().replace(/\s+/g, "-")}`}
            style={{ animationDelay: `${120 + i * 60}ms` }}
            className={`fade-up group text-left rounded-2xl border p-6 md:col-span-1 ${m.span} transition-transform hover:-translate-y-1 ${
              m.accent ? "bg-[#EAB308] border-[#EAB308]" : "bg-[#171717] border-white/10 hover:border-white/20"
            }`}
          >
            <div className="flex items-start justify-between">
              <m.icon size={32} weight="duotone" className={m.accent ? "text-[#0A0A0A]" : "text-[#EAB308]"} />
              <ArrowRight size={20} className={`opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all ${m.accent ? "text-[#0A0A0A]" : "text-white"}`} />
            </div>
            <h3 className={`font-display text-xl font-bold mt-6 ${m.accent ? "text-[#0A0A0A]" : "text-white"}`}>{m.title}</h3>
            <p className={`text-sm mt-1 ${m.accent ? "text-[#0A0A0A]/70" : "text-[#A3A3A3]"}`}>{m.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, color, label, value, testid }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#171717] p-5" data-testid={testid}>
      <Icon size={22} weight="fill" style={{ color }} />
      <div className="font-display text-2xl font-black mt-3 tabular-nums">{value}</div>
      <div className="text-xs text-[#525252] uppercase tracking-wider font-mono-type mt-0.5">{label}</div>
    </div>
  );
}
