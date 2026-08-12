import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Keyboard, GoogleLogo, Eye, EyeSlash } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login"); // login | register
  const [form, setForm] = useState({ name: "", email: "", password: "", age: false });
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);

  const upd = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
      } else {
        if (!form.age) { toast.error("Please confirm you are 13 or older."); setBusy(false); return; }
        await register({ name: form.name, email: form.email, password: form.password, age_confirmed: form.age });
      }
      navigate("/app/typing");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const googleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/app/typing";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative z-10 px-4">
      {/* ambient accent */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#EAB308]/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md fade-up relative">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-[#EAB308] flex items-center justify-center">
            <Keyboard weight="fill" className="text-[#0A0A0A]" size={24} />
          </div>
          <span className="font-display font-black text-2xl tracking-tight">MasterAI</span>
        </div>

        <div className="p-8 rounded-2xl border border-white/10 bg-[#171717]/60 backdrop-blur-xl shadow-2xl">
          <h1 className="font-display text-3xl font-bold tracking-tight text-center">Welcome</h1>
          <p className="text-[#A3A3A3] text-sm text-center mt-2 mb-7">
            Type it to master it. Learn with AI, remember it forever.
          </p>

          <button onClick={googleLogin} data-testid="google-login-button"
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-white text-[#0A0A0A] font-semibold text-sm hover:bg-neutral-200 transition-colors">
            <GoogleLogo weight="bold" size={20} /> Continue with Google
          </button>

          <div className="flex items-center gap-3 my-6">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-[#525252] font-mono-type uppercase tracking-widest">or</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "register" && (
              <Input data-testid="name-input" placeholder="Full name" value={form.name}
                onChange={(e) => upd("name", e.target.value)} required
                className="bg-[#0A0A0A] border-white/10 h-11" />
            )}
            <Input data-testid="email-input" type="email" placeholder="Email" value={form.email}
              onChange={(e) => upd("email", e.target.value)} required
              className="bg-[#0A0A0A] border-white/10 h-11" />
            <div className="relative">
              <Input data-testid="password-input" type={showPw ? "text" : "password"} placeholder="Password"
                value={form.password} onChange={(e) => upd("password", e.target.value)} required minLength={6}
                className="bg-[#0A0A0A] border-white/10 h-11 pr-10" />
              <button type="button" onClick={() => setShowPw((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#525252] hover:text-white">
                {showPw ? <EyeSlash size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {mode === "register" && (
              <label className="flex items-center gap-2 text-xs text-[#A3A3A3] cursor-pointer">
                <Checkbox data-testid="age-checkbox" checked={form.age}
                  onCheckedChange={(v) => upd("age", !!v)} />
                I confirm I am 13 years of age or older.
              </label>
            )}

            <Button type="submit" disabled={busy} data-testid="submit-auth-button"
              className="w-full h-11 bg-[#EAB308] text-[#0A0A0A] font-bold hover:bg-[#FACC15] rounded-xl">
              {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
            </Button>
          </form>

          <p className="text-center text-sm text-[#A3A3A3] mt-6">
            {mode === "login" ? "New here?" : "Already have an account?"}{" "}
            <button data-testid="toggle-auth-mode" onClick={() => setMode(mode === "login" ? "register" : "login")}
              className="text-[#EAB308] font-semibold hover:underline">
              {mode === "login" ? "Create an account" : "Log in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
