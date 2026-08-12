import { useState, useRef, useEffect, useCallback, useMemo } from "react";

/**
 * The shared monkeytype-style Type-Over engine.
 * Displays source text greyed out, user types on top, live char-by-char diff.
 * Props:
 *  - text: exact source string to reproduce
 *  - onComplete(stats)  stats = { wpm, accuracy, chars, seconds }
 *  - onFirstKey()       fired on the very first keystroke (used for Zen mode)
 *  - onProgress(pct)
 *  - autoFocus (default true)
 */
export function TypeOverEngine({ text, onComplete, onFirstKey, onProgress, autoFocus = true }) {
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(true);
  const [finished, setFinished] = useState(false);
  const startRef = useRef(null);
  const keysTyped = useRef(0);
  const keysCorrect = useRef(0);
  const firedFirst = useRef(false);
  const containerRef = useRef(null);
  const charRefs = useRef({});
  const [caret, setCaret] = useState({ left: 0, top: 0, height: 0, visible: false });
  const [liveWpm, setLiveWpm] = useState(0);

  const chars = useMemo(() => Array.from(text || ""), [text]);

  const reset = useCallback(() => {
    setInput("");
    setFinished(false);
    startRef.current = null;
    keysTyped.current = 0;
    keysCorrect.current = 0;
    firedFirst.current = false;
    setLiveWpm(0);
  }, []);

  useEffect(() => { reset(); }, [text, reset]);

  const accuracy = keysTyped.current ? Math.round((keysCorrect.current / keysTyped.current) * 100) : 100;

  const finish = useCallback((finalInput) => {
    const seconds = startRef.current ? (Date.now() - startRef.current) / 1000 : 0;
    const minutes = seconds / 60 || 1 / 60;
    const wpm = Math.round((finalInput.length / 5) / minutes);
    const acc = keysTyped.current ? Math.round((keysCorrect.current / keysTyped.current) * 100) : 100;
    setFinished(true);
    onComplete && onComplete({ wpm, accuracy: acc, chars: finalInput.length, seconds: Math.round(seconds) });
  }, [onComplete]);

  const handleKey = useCallback((e) => {
    if (finished) return;
    const key = e.key;
    if (key === "Backspace") {
      e.preventDefault();
      setInput((prev) => prev.slice(0, -1));
      return;
    }
    // ignore modifier / navigation keys
    if (key.length !== 1 || e.metaKey || e.ctrlKey || e.altKey) return;
    e.preventDefault();

    setInput((prev) => {
      if (prev.length >= chars.length) return prev;
      if (!startRef.current) startRef.current = Date.now();
      if (!firedFirst.current) { firedFirst.current = true; onFirstKey && onFirstKey(); }

      const pos = prev.length;
      keysTyped.current += 1;
      if (key === chars[pos]) keysCorrect.current += 1;

      const next = prev + key;
      onProgress && onProgress(Math.round((next.length / chars.length) * 100));
      if (next.length >= chars.length) {
        setTimeout(() => finish(next), 0);
      }
      return next;
    });
  }, [finished, chars, onFirstKey, onProgress, finish]);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  // live wpm ticker
  useEffect(() => {
    if (finished || !startRef.current) return;
    const id = setInterval(() => {
      const minutes = (Date.now() - startRef.current) / 60000 || 1 / 60;
      setLiveWpm(Math.round((input.length / 5) / minutes));
    }, 500);
    return () => clearInterval(id);
  }, [input, finished]);

  // caret positioning
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const idx = input.length;
    const target = charRefs.current[idx];
    const cont = container.getBoundingClientRect();
    if (target) {
      const r = target.getBoundingClientRect();
      setCaret({ left: r.left - cont.left, top: r.top - cont.top, height: r.height, visible: focused });
    } else {
      const last = charRefs.current[idx - 1];
      if (last) {
        const r = last.getBoundingClientRect();
        setCaret({ left: r.right - cont.left, top: r.top - cont.top, height: r.height, visible: focused });
      }
    }
  }, [input, focused, chars]);

  // group into words for natural wrapping
  const words = useMemo(() => {
    const out = [];
    let word = [];
    chars.forEach((ch, i) => {
      if (ch === " ") { out.push({ type: "word", items: word }); out.push({ type: "space", index: i }); word = []; }
      else word.push({ ch, index: i });
    });
    if (word.length) out.push({ type: "word", items: word });
    return out;
  }, [chars]);

  const charClass = (i, ch) => {
    if (i >= input.length) return "text-[#525252]";
    return input[i] === ch ? "text-[#E5E5E5]" : "text-[#F43F5E] bg-[#F43F5E]/10 rounded-sm";
  };

  return (
    <div data-testid="type-over-engine" onClick={() => setFocused(true)}>
      <div className="flex items-center gap-6 mb-6 font-mono-type text-sm">
        <span className="text-[#EAB308] text-2xl font-bold tabular-nums" data-testid="live-wpm">{finished ? "—" : liveWpm} <span className="text-[#525252] text-sm font-normal">wpm</span></span>
        <span className="text-[#A3A3A3] tabular-nums" data-testid="live-accuracy">{accuracy}% <span className="text-[#525252]">acc</span></span>
        <span className="text-[#525252] tabular-nums ml-auto">{input.length}/{chars.length}</span>
      </div>

      <div
        ref={containerRef}
        className="relative font-mono-type text-xl sm:text-2xl md:text-3xl leading-[2.2] tracking-wide select-none cursor-text"
        onMouseDown={() => setFocused(true)}
      >
        {caret.visible && (
          <span
            className="type-caret"
            style={{ left: caret.left, top: caret.top, height: caret.height || "1.4em" }}
          />
        )}
        {words.map((tok, wi) =>
          tok.type === "space" ? (
            <span key={`s-${tok.index}`} ref={(el) => (charRefs.current[tok.index] = el)}
                  className={charClass(tok.index, " ")}>&nbsp;</span>
          ) : (
            <span key={`w-${wi}`} className="inline-block whitespace-nowrap">
              {tok.items.map((c) => (
                <span key={c.index} ref={(el) => (charRefs.current[c.index] = el)}
                      className={charClass(c.index, c.ch)}>{c.ch}</span>
              ))}
            </span>
          )
        )}
      </div>
    </div>
  );
}
