import { useState, useEffect } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Check, X, Sparkle, Lightning } from "@phosphor-icons/react";

const FEATURES = [
  ["Learn from Scratch", "3 topics / month", "Unlimited*"],
  ["Ask AI", "10 / day", "Unlimited*"],
  ["Learn from Documents", "2 uploads / month", "100 / month"],
  ["Test Yourself", true, "Unlimited"],
  ["Typing Practice", "Unlimited", "Unlimited"],
  ["Word of the Day", "Daily", "Daily"],
  ["XP & Badges", true, true],
  ["AI Learning Levels", "Beginner only", "All 4 levels"],
  ["Priority AI Response", false, true],
];

export default function Subscription() {
  const { user, refreshUser } = useAuth();
  const [credits, setCredits] = useState(null);

  useEffect(() => { api.get("/credits").then((r) => setCredits(r.data)).catch(() => {}); }, []);

  const upgrade = () => toast("Payments (Razorpay) coming soon — this is a demo plan surface.", { description: "Your account stays on the Free tier for now." });

  const cell = (v, pro) => {
    if (v === true) return <Check weight="bold" className={pro ? "text-[#0A0A0A]" : "text-green-500"} />;
    if (v === false) return <X weight="bold" className="text-[#525252]" />;
    return <span className={`text-sm ${pro ? "text-[#0A0A0A]" : "text-[#A3A3A3]"}`}>{v}</span>;
  };

  return (
    <div className="space-y-8 max-w-4xl" data-testid="subscription">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">Subscription & Credits</h1>
        <p className="text-[#A3A3A3] mt-2">Learning stays premium. AI usage stays generous.</p>
      </div>

      {/* Usage */}
      {credits && (
        <div className="rounded-2xl border border-white/10 bg-[#171717] p-6" data-testid="usage-card">
          <div className="flex items-center justify-between mb-3">
            <span className="font-medium flex items-center gap-2"><Lightning weight="fill" className="text-[#EAB308]" /> AI Usage this month</span>
            <span className="font-display font-black text-2xl text-[#EAB308]">{credits.ai_usage_remaining_pct}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-[#0A0A0A] overflow-hidden">
            <div className="h-full bg-[#EAB308] rounded-full transition-all" style={{ width: `${credits.ai_usage_remaining_pct}%` }} />
          </div>
          <p className="text-xs text-[#525252] mt-2">remaining · resets monthly</p>
        </div>
      )}

      {/* Plans */}
      <div className="grid md:grid-cols-2 gap-5">
        {/* Free */}
        <div className={`rounded-2xl border p-7 ${user?.plan === "Free" ? "border-[#EAB308]/40" : "border-white/10"} bg-[#171717]`}>
          <h3 className="font-display text-xl font-bold">Free</h3>
          <p className="font-display text-4xl font-black mt-3">₹0</p>
          <p className="text-sm text-[#A3A3A3] mt-1">For casual learners getting started.</p>
          {user?.plan === "Free" && <div className="mt-4 text-xs font-mono-type uppercase tracking-widest text-[#EAB308]">Current plan</div>}
        </div>

        {/* Pro */}
        <div className="rounded-2xl border border-[#EAB308] bg-[#EAB308] p-7 text-[#0A0A0A] relative overflow-hidden">
          <span className="absolute top-4 right-4 text-[10px] font-mono-type uppercase tracking-widest bg-[#0A0A0A] text-[#EAB308] px-2 py-1 rounded-full">Launch price</span>
          <h3 className="font-display text-xl font-bold flex items-center gap-2"><Sparkle weight="fill" /> Pro</h3>
          <p className="font-display text-4xl font-black mt-3">₹499 <span className="text-base font-medium line-through opacity-50">₹999</span></p>
          <p className="text-sm text-[#0A0A0A]/70 mt-1">Unlimited AI. All learning levels.</p>
          <button onClick={upgrade} data-testid="upgrade-button"
            className="mt-5 w-full py-3 rounded-xl bg-[#0A0A0A] text-[#EAB308] font-bold hover:bg-[#171717] transition-colors">
            Upgrade to Pro
          </button>
        </div>
      </div>

      {/* Comparison */}
      <div className="rounded-2xl border border-white/10 bg-[#171717] overflow-hidden">
        <div className="grid grid-cols-3 px-6 py-4 border-b border-white/10 text-xs font-mono-type uppercase tracking-widest text-[#525252]">
          <span>Feature</span><span className="text-center">Free</span><span className="text-center">Pro</span>
        </div>
        {FEATURES.map(([f, free, pro], i) => (
          <div key={i} className="grid grid-cols-3 px-6 py-3.5 border-b border-white/5 last:border-0 items-center text-sm">
            <span className="font-medium">{f}</span>
            <span className="flex justify-center">{cell(free, false)}</span>
            <span className="flex justify-center">{cell(pro, false)}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-[#525252]">*Unlimited subject to Fair Usage Policy.</p>
    </div>
  );
}
