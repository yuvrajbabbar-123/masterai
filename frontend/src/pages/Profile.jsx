import { useState, useEffect } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import {
  Lightning, Flame, Target, Trophy, Medal, WarningCircle, LockSimple, ChartLineUp,
} from "@phosphor-icons/react";

const LEVELS = ["Beginner", "Intermediate", "Advanced", "Master"];

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [data, setData] = useState(null);

  const load = () => api.get("/profile").then((r) => setData(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const setLevel = async (lvl, locked) => {
    if (locked) {
      toast.error("Upgrade to Pro to unlock higher learning levels.");
      return;
    }
    try {
      await api.put("/profile/level", { learning_level: lvl });
      toast.success(`Level set to ${lvl}`);
      await refreshUser();
      load();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  if (!data) return <div className="text-[#525252] font-mono-type animate-pulse">loading profile…</div>;
  const { stats, per_subject, struggled_concepts, badges } = data;
  const isPro = user?.plan === "Pro";

  return (
    <div className="space-y-8" data-testid="profile">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-[#262626] border border-white/10 flex items-center justify-center overflow-hidden">
          {user?.picture ? <img src={user.picture} alt="" className="w-full h-full object-cover" /> :
            <span className="font-display font-black text-2xl text-[#EAB308]">{user?.name?.[0]?.toUpperCase()}</span>}
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{user?.name}</h1>
          <p className="text-[#A3A3A3] text-sm">{user?.email} · <span className="text-[#EAB308]">{user?.plan} plan</span></p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Stat icon={Lightning} color="#EAB308" label="XP" value={user?.xp || 0} />
        <Stat icon={Flame} color="#F97316" label="Streak" value={user?.streak || 0} />
        <Stat icon={ChartLineUp} color="#22C55E" label="Avg WPM" value={stats.avg_wpm} />
        <Stat icon={Target} color="#3B82F6" label="Avg Acc" value={`${stats.avg_accuracy}%`} />
        <Stat icon={Trophy} color="#A855F7" label="Sessions" value={stats.total_attempts} />
      </div>

      {/* Learning level */}
      <section className="rounded-2xl border border-white/10 bg-[#171717] p-6">
        <h2 className="font-display text-lg font-bold mb-4">Learning Level</h2>
        <div className="flex flex-wrap gap-2">
          {LEVELS.map((lvl) => {
            const locked = !isPro && lvl !== "Beginner";
            const active = user?.learning_level === lvl;
            return (
              <button key={lvl} onClick={() => setLevel(lvl, locked)} data-testid={`level-${lvl}`}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                  active ? "bg-[#EAB308] text-[#0A0A0A] border-[#EAB308]" :
                  locked ? "border-white/10 text-[#525252] hover:border-[#F43F5E]/40" :
                  "border-white/10 text-[#A3A3A3] hover:border-white/30 hover:text-white"
                }`}>
                {locked && <LockSimple size={13} weight="bold" />} {lvl}
              </button>
            );
          })}
        </div>
        {!isPro && <p className="text-xs text-[#525252] mt-3">Upgrade to Pro to unlock Intermediate, Advanced & Master levels.</p>}
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Badges */}
        <section className="rounded-2xl border border-white/10 bg-[#171717] p-6">
          <h2 className="font-display text-lg font-bold mb-4 flex items-center gap-2"><Medal weight="fill" className="text-[#EAB308]" /> Badges</h2>
          {badges.length === 0 ? <p className="text-sm text-[#525252]">Earn XP to unlock badges.</p> : (
            <div className="flex flex-wrap gap-3">
              {badges.map((b) => (
                <div key={b.id} data-testid={`badge-${b.id}`} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#EAB308]/10 border border-[#EAB308]/30">
                  <Trophy weight="fill" className="text-[#EAB308]" size={18} />
                  <span className="text-sm font-medium">{b.name}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Struggled */}
        <section className="rounded-2xl border border-white/10 bg-[#171717] p-6">
          <h2 className="font-display text-lg font-bold mb-4 flex items-center gap-2"><WarningCircle weight="fill" className="text-[#F43F5E]" /> Concepts to revise</h2>
          {struggled_concepts.length === 0 ? <p className="text-sm text-[#525252]">Nothing flagged. Great typing accuracy!</p> : (
            <ul className="space-y-2">
              {struggled_concepts.slice(0, 6).map((c, i) => (
                <li key={i} className="flex items-center justify-between text-sm border-b border-white/5 pb-2">
                  <span>{c.concept}</span>
                  <span className="text-[#525252] font-mono-type text-xs">{c.subject}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Per subject */}
      {per_subject.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-[#171717] p-6">
          <h2 className="font-display text-lg font-bold mb-4">Progress by subject</h2>
          <div className="space-y-3">
            {per_subject.map((s, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1"><span>{s.subject}</span><span className="text-[#A3A3A3] tabular-nums">{s.accuracy}% · {s.attempts} reps</span></div>
                <div className="h-2 rounded-full bg-[#0A0A0A] overflow-hidden">
                  <div className="h-full bg-[#EAB308] rounded-full transition-all" style={{ width: `${s.accuracy}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ icon: Icon, color, label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#171717] p-4">
      <Icon size={20} weight="fill" style={{ color }} />
      <div className="font-display text-2xl font-black mt-2 tabular-nums">{value}</div>
      <div className="text-[10px] text-[#525252] uppercase tracking-wider font-mono-type">{label}</div>
    </div>
  );
}
