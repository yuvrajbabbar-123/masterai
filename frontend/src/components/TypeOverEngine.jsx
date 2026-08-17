import { useState, useRef, useEffect, useCallback, useMemo } from "react";

/**
 * The shared monkeytype-style Type-Over engine.
 * Displays source text greyed out, user types on top, live char-by-char diff.
 * Uses a hidden focusable input so mobile soft-keyboards appear and work.
 * Props:
 *  - text: exact source string to reproduce
 *  - onComplete(stats)  stats = { wpm, accuracy, chars, seconds }
 *  - onFirstKey()       fired on the very first keystroke (used for Zen mode)
 *  - onProgress(pct)
 */
export function TypeOverEngine({ text, onComplete, onFirstKey, onProgress }) {
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const [finished, setFinished] = useState(false);
  const startRef = useRef(null);
  const keysTyped = useRef(0);
  const keysCorrect = useRef(0);
  const firedFirst = useRef(false);
  const containerRef = useRef(null);
  const hiddenInputRef = useRef(null);
  const charRefs = useRef({});
  const [caret, setCaret] = useState({ left: 0, top: 0, height: 0 });
  const [liveWpm, setLiveWpm] = useState(0);

  const chars = useMemo(() => Array.from(text || ""), [text]);

  useEffect(() => {
    setInput("");
    setFinished(false);
    startRef.current = null;
    keysTyped.current = 0;
    keysCorrect.current = 0;
    firedFirst.current = false;
    setLiveWpm(0);
    // autofocus so typing (and mobile keyboard) starts immediately
    const t = setTimeout(() => hiddenInputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [text]);

  const accuracy = keysTyped.current ? Math.round((keysCorrect.current / keysTyped.current) * 100) : 100;

  const finish = useCallback((finalInput) => {
    const seconds = startRef.current ? (Date.now() - startRef.current) / 1000 : 0;
    const minutes = seconds / 60 || 1 / 60;
    const wpm = Math.round((finalInput.length / 5) / minutes);
    const acc = keysTyped.current ? Math.round((keysCorrect.current / keysTyped.current) * 100) : 100;
    setFinished(true);
    onComplete && onComplete({ wpm, accuracy: acc, chars: finalInput.length, seconds: Math.round(seconds) });
  }, [onComplete]);

  const handleChange = useCallback((e) => {
    if (finished) return;
    let val = e.target.value;
    if (val.length > chars.length) val = val.slice(0, chars.length);
    setInput((prev) => {
      if (!startRef.current && val.length > 0) startRef.current = Date.now();
      if (!firedFirst.current && val.length > 0) { firedFirst.current = true; onFirstKey && onFirstKey(); }
      if (val.length > prev.length) {
        for (let i = prev.length; i < val.length; i++) {
          keysTyped.current += 1;
          if (val[i] === chars[i]) keysCorrect.current += 1;
        }
      }
      onProgress && onProgress(Math.round((val.length / chars.length) * 100));
      if (val.length >= chars.length) setTimeout(() => finish(val), 0);
      return val;
    });
  }, [finished, chars, onFirstKey, onProgress, finish]);

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
      setCaret({ left: r.left - cont.left, top: r.top - cont.top, height: r.height });
    } else {
      const last = charRefs.current[idx - 1];
      if (last) {
        const r = last.getBoundingClientRect();
        setCaret({ left: r.right - cont.left, top: r.top - cont.top, height: r.height });
      }
    }
  }, [input, chars]);

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

  const focusInput = () => hiddenInputRef.current?.focus();

  return (
    <div data-testid="type-over-engine">
      <div className="flex items-center gap-4 sm:gap-6 mb-4 sm:mb-6 font-mono-type text-xs sm:text-sm">
        <span className="text-[#EAB308] text-xl sm:text-2xl font-bold tabular-nums" data-testid="live-wpm">{finished ? "—" : liveWpm} <span className="text-[#525252] text-xs sm:text-sm font-normal">wpm</span></span>
        <span className="text-[#A3A3A3] tabular-nums" data-testid="live-accuracy">{accuracy}% <span className="text-[#525252]">acc</span></span>
        <span className="text-[#525252] tabular-nums ml-auto">{input.length}/{chars.length}</span>
      </div>

      <div
        ref={containerRef}
        onClick={focusInput}
        className="relative font-mono-type text-lg sm:text-2xl md:text-3xl leading-[2] sm:leading-[2.2] tracking-wide select-none cursor-text"
      >
        {/* Hidden but focusable input — drives desktop + mobile keyboards */}
        <input
          ref={hiddenInputRef}
          data-testid="type-input"
          value={input}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={finished}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          inputMode="text"
          aria-label="Type the text shown"
          className="absolute inset-0 w-full h-full opacity-0 cursor-text z-20"
          style={{ caretColor: "transparent" }}
        />

        {focused && !finished && (
          <span
            className="type-caret z-10"
            style={{ left: caret.left, top: caret.top, height: caret.height || "1.4em" }}
          />
        )}

        {/* Tap-to-start overlay (mobile-friendly) */}
        {!focused && !finished && input.length === 0 && (
          <div className="absolute inset-0 z-30 flex items-center justify-center" onClick={focusInput}>
            <span className="px-4 py-2 rounded-full bg-[#171717] border border-white/10 text-sm text-[#A3A3A3] font-sans" data-testid="tap-to-type">
              Tap here to start typing
            </span>
          </div>
        )}

        <div className={!focused && input.length === 0 ? "opacity-30" : ""}>
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
    </div>
  );
}
