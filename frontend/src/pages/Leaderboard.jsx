import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Trophy, Lightning, Gauge } from "@phosphor-icons/react";

export default function Leaderboard() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("xp");

  useEffect(() => { api.get("/leaderboard").then((r) => setData(r.data)).catch(() => {}); }, []);

  if (!data) return <div className="text-[#525252] font-mono-type animate-pulse">loading rankings…</div>;
  const rows = tab === "xp" ? data.xp : data.speed;

  return (
    <div className="space-y-8 max-w-3xl" data-testid="leaderboard">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight flex items-center gap-3">
          <Trophy size={34} weight="duotone" className="text-[#EAB308]" /> Leaderboard
        </h1>
        <p className="text-[#A3A3A3] mt-2">Rank by knowledge earned or raw typing speed.</p>
      </div>

      <div className="flex gap-1 p-1 rounded-full border border-white/10 bg-[#171717] w-fit">
        <button onClick={() => setTab("xp")} data-testid="tab-xp"
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${tab === "xp" ? "bg-[#EAB308] text-[#0A0A0A]" : "text-[#A3A3A3]"}`}>
          <Lightning weight="fill" size={15} /> XP
        </button>
        <button onClick={() => setTab("speed")} data-testid="tab-speed"
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${tab === "speed" ? "bg-[#EAB308] text-[#0A0A0A]" : "text-[#A3A3A3]"}`}>
          <Gauge weight="fill" size={15} /> Speed
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#171717] overflow-hidden">
        {rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-[#525252]">No data yet — be the first to top the board!</p>
        ) : rows.map((r, i) => (
          <div key={i} data-testid={`rank-${i}`}
            className={`flex items-center gap-4 px-5 py-4 border-b border-white/5 last:border-0 ${r.user_id === data.me ? "bg-[#EAB308]/5" : ""}`}>
            <span className={`font-display font-black text-lg w-8 tabular-nums ${i < 3 ? "text-[#EAB308]" : "text-[#525252]"}`}>{i + 1}</span>
            <div className="w-9 h-9 rounded-full bg-[#262626] border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
              {r.picture ? <img src={r.picture} alt="" className="w-full h-full object-cover" /> :
                <span className="font-display font-bold text-sm">{r.name?.[0]?.toUpperCase()}</span>}
            </div>
            <span className="flex-1 font-medium truncate">{r.name}</span>
            <span className="font-display font-black tabular-nums text-[#EAB308]">
              {tab === "xp" ? `${r.xp} XP` : `${r.best_wpm} wpm`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
