import api from "@/lib/api";
import { toast } from "sonner";

export async function recordAttempt(payload, refreshUser) {
  try {
    const res = await api.post("/attempts", payload);
    const d = res.data;
    toast.success(`+${d.xp_gained} XP`, { description: `Streak ${d.streak} day${d.streak === 1 ? "" : "s"}` });
    (d.new_badges || []).forEach((b) =>
      toast(`🏅 Badge unlocked: ${b}`, { className: "font-display" })
    );
    if (refreshUser) refreshUser();
    return d;
  } catch (e) {
    return null;
  }
}
