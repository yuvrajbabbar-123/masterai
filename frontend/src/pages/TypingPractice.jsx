import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { TypeOverEngine } from "@/components/TypeOverEngine";
import { useAuth } from "@/context/AuthContext";
import { recordAttempt } from "@/lib/attempts";
import { ArrowClockwise, TextAa, Quotes } from "@phosphor-icons/react";

export default function TypingPractice() {
  const { refreshUser } = useAuth();
  const [text, setText] = useState("");
  const [mode, setMode] = useState("words");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [keyReset, setKeyReset] = useState(0);

  const load = useCallback(async (m = mode) => {
    setLoading(true);
    setResult(null);
    try {
      const res = await api.get(`/typing/random`, { params: { mode: m, count: 40 } });
      setText(res.data.text);
      setKeyReset((k) => k + 1);
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => { load(mode); /* eslint-disable-next-line */ }, [mode]);

  const onComplete = async (stats) => {
    setResult(stats);
    await recordAttempt({ mode: "typing_practice", wpm: stats.wpm, accuracy: stats.accuracy, chars: stats.chars, subject: "Typing", passed: true }, refreshUser);
  };

  return (
    <div className="min-h-[70vh] flex flex-col" data-testid="typing-practice">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Typing Practice</h1>
          <p className="text-[#A3A3A3] text-sm mt-1">The pure mechanic. Just start typing.</p>
        </div>
        <div className="flex gap-1 p-1 rounded-full border border-white/10 bg-[#171717]">
          <TabBtn active={mode === "words"} onClick={() => setMode("words")} icon={TextAa} label="Words" testid="mode-words" />
          <TabBtn active={mode === "quote"} onClick={() => setMode("quote")} icon={Quotes} label="Quote" testid="mode-quote" />
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full">
        {loading ? (
          <div className="text-[#525252] font-mono-type animate-pulse text-center">loading text…</div>
        ) : result ? (
          <ResultCard result={result} onRestart={() => load(mode)} />
        ) : (
          <TypeOverEngine key={keyReset} text={text} onComplete={onComplete} />
        )}
      </div>

      {!result && !loading && (
        <div className="flex justify-center mt-10">
          <button onClick={() => load(mode)} data-testid="new-text-button"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/10 text-sm text-[#A3A3A3] hover:text-white hover:border-white/30 transition-colors font-mono-type">
            <ArrowClockwise size={16} /> new text · tab
          </button>
        </div>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, label, testid }) {
  return (
    <button onClick={onClick} data-testid={testid}
      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
        active ? "bg-[#EAB308] text-[#0A0A0A]" : "text-[#A3A3A3] hover:text-white"
      }`}>
      <Icon size={15} weight="bold" /> {label}
    </button>
  );
}

export function ResultCard({ result, onRestart, label = "next" }) {
  return (
    <div className="fade-up text-center" data-testid="result-card">
      <p className="font-mono-type text-[#525252] uppercase tracking-widest text-sm">Complete</p>
      <div className="flex items-center justify-center gap-12 my-8">
        <Metric value={result.wpm} label="wpm" big />
        <Metric value={`${result.accuracy}%`} label="accuracy" />
        <Metric value={`${result.seconds}s`} label="time" />
      </div>
      <button onClick={onRestart} data-testid="restart-button"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#EAB308] text-[#0A0A0A] font-bold hover:bg-[#FACC15] transition-colors">
        <ArrowClockwise size={18} weight="bold" /> {label}
      </button>
    </div>
  );
}

function Metric({ value, label, big }) {
  return (
    <div>
      <div className={`font-display font-black tabular-nums ${big ? "text-6xl text-[#EAB308]" : "text-5xl text-white"}`}>{value}</div>
      <div className="text-xs text-[#525252] uppercase tracking-widest font-mono-type mt-1">{label}</div>
    </div>
  );
}
