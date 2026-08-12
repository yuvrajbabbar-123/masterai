import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Keyboard } from "@phosphor-icons/react";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { applyAuth } = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const hash = window.location.hash;
    const match = hash.match(/session_id=([^&]+)/);
    const sessionId = match ? match[1] : null;

    const run = async () => {
      if (!sessionId) { navigate("/login"); return; }
      try {
        const res = await api.post("/auth/google/session", { session_id: sessionId });
        applyAuth(res.data);
        window.history.replaceState(null, "", "/app/typing");
        navigate("/app/typing", { state: { user: res.data.user } });
      } catch {
        navigate("/login");
      }
    };
    run();
  }, [navigate, applyAuth]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 relative z-10">
      <div className="w-12 h-12 rounded-xl bg-[#EAB308] flex items-center justify-center animate-pulse">
        <Keyboard weight="fill" className="text-[#0A0A0A]" size={28} />
      </div>
      <p className="text-[#A3A3A3] font-mono-type text-sm">Signing you in…</p>
    </div>
  );
}
