import { useState, useEffect } from "react";
import { DownloadSimple, X, Share } from "@phosphor-icons/react";

const DISMISS_KEY = "masterai_a2hs_dismissed";

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    // Already installed / running standalone → never show
    const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
    if (standalone) return;

    const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    const isSafari = isIOS && /safari/i.test(window.navigator.userAgent) && !/crios|fxios/i.test(window.navigator.userAgent);

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferred(e);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // iOS Safari has no beforeinstallprompt → show manual hint
    if (isSafari) {
      const t = setTimeout(() => { setIosHint(true); setVisible(true); }, 2500);
      return () => { clearTimeout(t); window.removeEventListener("beforeinstallprompt", onBeforeInstall); };
    }

    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, "1");
  };

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    try { await deferred.userChoice; } catch {}
    setDeferred(null);
    dismiss();
  };

  if (!visible) return null;

  return (
    <div
      data-testid="install-prompt"
      className="fixed bottom-4 inset-x-4 z-[60] mx-auto max-w-sm rounded-2xl border border-white/10 bg-[#171717]/95 backdrop-blur-xl shadow-2xl p-4 fade-up"
    >
      <button onClick={dismiss} data-testid="install-dismiss" aria-label="Dismiss"
        className="absolute top-3 right-3 text-[#525252] hover:text-white">
        <X size={18} weight="bold" />
      </button>
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 shrink-0 rounded-xl bg-[#EAB308] flex items-center justify-center">
          <DownloadSimple size={22} weight="bold" className="text-[#0A0A0A]" />
        </div>
        <div className="pr-5">
          <p className="font-display font-bold text-sm">Install MasterAI</p>
          {iosHint ? (
            <p className="text-xs text-[#A3A3A3] mt-1 flex items-center gap-1 flex-wrap">
              Tap <Share size={14} className="inline" /> then "Add to Home Screen".
            </p>
          ) : (
            <p className="text-xs text-[#A3A3A3] mt-1">Add it to your home screen for quick, full-screen access.</p>
          )}
        </div>
      </div>
      {!iosHint && (
        <button onClick={install} data-testid="install-accept"
          className="mt-3 w-full py-2.5 rounded-xl bg-[#EAB308] text-[#0A0A0A] font-bold text-sm hover:bg-[#FACC15] transition-colors">
          Add to Home Screen
        </button>
      )}
    </div>
  );
}
