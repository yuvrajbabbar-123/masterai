import { useState, useEffect, useRef, useCallback } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { TypeOverEngine } from "@/components/TypeOverEngine";
import {
  PaperPlaneRight, Plus, ClockCounterClockwise, Copy, Check,
  Trash, Sparkle, Robot, Keyboard, X,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SUGGESTIONS = [
  "Explain quantum entanglement simply",
  "Write a haiku about the ocean",
  "Give me 5 tips to learn faster",
  "Summarize the French Revolution",
];

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied");
      setTimeout(() => setCopied(false), 1500);
    } catch { toast.error("Copy failed"); }
  };
  return (
    <button onClick={copy} data-testid="copy-message-button"
      className="flex items-center gap-1 text-[#525252] hover:text-white transition-colors text-xs p-1 rounded">
      {copied ? <Check size={15} weight="bold" className="text-green-400" /> : <Copy size={15} />}
    </button>
  );
}

function AssistantMessage({ content }) {
  const [practicing, setPracticing] = useState(false);

  return (
    <div className="group max-w-[85%]" data-testid="assistant-answer">
      <div className="rounded-2xl px-4 py-3 bg-[#171717] border border-white/10">
        {practicing ? (
          <div data-testid="answer-practice">
            <TypeOverEngine text={content} />
          </div>
        ) : (
          // greyed-out answer
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-[#737373]" data-testid="answer-text">
            {content}
          </p>
        )}
      </div>
      <div className="mt-1.5 flex items-center gap-3">
        {!practicing ? (
          <button onClick={() => setPracticing(true)}
            data-testid="practice-answer-button"
            className="flex items-center gap-1 text-xs text-[#525252] hover:text-[#EAB308] transition-colors p-1 rounded">
            <Keyboard size={15} /> Practice
          </button>
        ) : (
          <button onClick={() => setPracticing(false)}
            data-testid="stop-practice-button"
            className="flex items-center gap-1 text-xs text-[#525252] hover:text-white transition-colors p-1 rounded">
            <X size={15} /> Close
          </button>
        )}
        <CopyButton text={content} />
      </div>
    </div>
  );
}

export default function AskAI() {
  const [threadId, setThreadId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [threads, setThreads] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const taRef = useRef(null);

  const loadThreads = useCallback(async () => {
    try { const res = await api.get("/chat/threads"); setThreads(res.data); } catch {}
  }, []);
  useEffect(() => { loadThreads(); }, [loadThreads]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  const newChat = () => { setThreadId(null); setMessages([]); setInput(""); taRef.current?.focus(); };

  const openThread = async (id) => {
    try {
      const res = await api.get(`/chat/threads/${id}`);
      setThreadId(id);
      setMessages((res.data.messages || []).map((m) => ({ role: m.role, content: m.content })));
    } catch { toast.error("Could not open conversation"); }
  };

  const deleteThread = async (id, e) => {
    e?.stopPropagation();
    try {
      await api.delete(`/chat/threads/${id}`);
      if (id === threadId) newChat();
      loadThreads();
      toast.success("Conversation deleted");
    } catch { toast.error("Delete failed"); }
  };

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || sending) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: msg }]);
    setSending(true);
    try {
      const res = await api.post("/chat", { thread_id: threadId, message: msg });
      setThreadId(res.data.thread_id);
      setMessages((m) => [...m, { role: "assistant", content: res.data.reply }]);
      loadThreads();
    } catch (err) {
      toast.error(err.response?.data?.detail || "AI failed to respond");
      setMessages((m) => [...m, { role: "assistant", content: "Sorry — I couldn't respond just now. Please try again." }]);
    } finally { setSending(false); }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)]" data-testid="ask-ai">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Sparkle size={26} weight="duotone" className="text-[#EAB308]" /> Ask AI
        </h1>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button data-testid="history-button"
                className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-white/10 text-sm text-[#A3A3A3] hover:text-white hover:border-white/30 transition-colors">
                <ClockCounterClockwise size={16} /> History
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 max-h-80 overflow-y-auto bg-[#171717] border-white/10">
              {threads.length === 0 ? (
                <div className="px-3 py-4 text-sm text-[#525252]">No conversations yet</div>
              ) : threads.map((t) => (
                <DropdownMenuItem key={t.thread_id} onClick={() => openThread(t.thread_id)}
                  data-testid={`thread-${t.thread_id}`}
                  className="flex items-center justify-between gap-2 cursor-pointer focus:bg-white/5">
                  <span className="truncate text-sm">{t.title}</span>
                  <button onClick={(e) => deleteThread(t.thread_id, e)} className="text-[#525252] hover:text-[#F43F5E] shrink-0">
                    <Trash size={14} />
                  </button>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={newChat} data-testid="new-chat-button"
            className="h-9 px-4 bg-[#EAB308] text-[#0A0A0A] font-bold hover:bg-[#FACC15] rounded-full">
            <Plus size={16} weight="bold" className="mr-1" /> New chat
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto rounded-2xl border border-white/10 bg-[#0D0D0D] p-4 sm:p-6 space-y-6">
        {messages.length === 0 && !sending ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-6" data-testid="chat-empty">
            <div className="w-16 h-16 rounded-2xl bg-[#EAB308]/10 flex items-center justify-center">
              <Robot size={34} weight="duotone" className="text-[#EAB308]" />
            </div>
            <div>
              <p className="font-display text-xl font-bold">How can I help you learn today?</p>
              <p className="text-[#A3A3A3] text-sm mt-1">Ask anything — read the answer, then hit Practice to type it out.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-2 w-full max-w-lg">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} data-testid="suggestion-chip"
                  className="text-left text-sm px-4 py-3 rounded-xl border border-white/10 text-[#A3A3A3] hover:border-[#EAB308] hover:text-white transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((m, i) => (
              <div key={i} data-testid={`chat-message-${m.role}`}
                className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && (
                  <div className="w-8 h-8 rounded-lg bg-[#EAB308] flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkle size={16} weight="fill" className="text-[#0A0A0A]" />
                  </div>
                )}
                {m.role === "assistant" ? (
                  <AssistantMessage content={m.content} />
                ) : (
                  <div className="max-w-[85%] order-2">
                    <div className="rounded-2xl px-4 py-3 text-sm leading-relaxed bg-[#EAB308] text-[#0A0A0A] font-medium">
                      <span className="whitespace-pre-wrap">{m.content}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {sending && (
              <div className="flex gap-3" data-testid="chat-thinking">
                <div className="w-8 h-8 rounded-lg bg-[#EAB308] flex items-center justify-center shrink-0">
                  <Sparkle size={16} weight="fill" className="text-[#0A0A0A]" />
                </div>
                <div className="rounded-2xl px-4 py-3 bg-[#171717] border border-white/10 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#525252] animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-[#525252] animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-[#525252] animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Composer */}
      <div className="mt-4 shrink-0">
        <div className="flex items-end gap-3 rounded-2xl border border-white/10 bg-[#171717] p-2 pl-4 focus-within:border-[#EAB308]/50 transition-colors">
          <textarea
            ref={taRef}
            data-testid="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Message MasterAI…  (Enter to send, Shift+Enter for a new line)"
            className="flex-1 bg-transparent resize-none outline-none text-sm py-2 max-h-40 text-[#E5E5E5] placeholder:text-[#525252]"
          />
          <button onClick={() => send()} disabled={sending || !input.trim()} data-testid="send-button"
            className="w-10 h-10 rounded-xl bg-[#EAB308] text-[#0A0A0A] flex items-center justify-center hover:bg-[#FACC15] transition-colors disabled:opacity-40 shrink-0">
            <PaperPlaneRight size={18} weight="fill" />
          </button>
        </div>
        <p className="text-[10px] text-[#525252] text-center mt-2 font-mono-type">MasterAI can make mistakes. Verify important info.</p>
      </div>
    </div>
  );
}
