import { useEffect, useRef, useState } from "react";
import { CHAT_FALLBACK, CHAT_KB } from "../data/medical";
import { prefersReducedMotion } from "../lib/engine";
import { Icon } from "./ui";

interface Msg {
  role: "user" | "bot";
  text: string;
}

const QUICK = [
  "What is a CNN?",
  "Why normalize ÷255?",
  "Precision vs recall?",
  "When to see a doctor?",
  "Is this tool accurate?",
];

export function matchAnswer(input: string): string {
  const q = input.toLowerCase();
  let best: { score: number; answer: string } = { score: 0, answer: CHAT_FALLBACK };
  for (const entry of CHAT_KB) {
    let score = 0;
    for (const k of entry.keys) {
      if (q.includes(k)) score += k.length; // longer key = stronger signal
    }
    if (score > best.score) best = { score, answer: entry.answer };
  }
  return best.answer;
}

export function Chatbot() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "bot",
      text: "MedLens NLP desk online. I answer questions about this diagnostic pipeline and general symptom guidance — I never store anything. Ask away, or tap a prompt below.",
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || typing) return;
    setMessages((m) => [...m, { role: "user", text: trimmed }]);
    setInput("");
    setTyping(true);
    timer.current = window.setTimeout(
      () => {
        setMessages((m) => [...m, { role: "bot", text: matchAnswer(trimmed) }]);
        setTyping(false);
      },
      prefersReducedMotion() ? 60 : 650 + Math.random() * 450
    );
  };

  return (
    <div className="flex h-[520px] flex-col">
      <div ref={scrollRef} className="chat-scroll flex-1 space-y-3 overflow-y-auto border border-ink/15 bg-paperdeep/50 p-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] border px-3.5 py-2.5 text-[13px] leading-relaxed ${
                m.role === "user"
                  ? "border-ink bg-ink text-paper"
                  : "border-teal/30 bg-paper text-ink shadow-[3px_3px_0_0_rgba(14,124,114,0.15)]"
              }`}
            >
              {m.role === "bot" && (
                <span className="mb-1 flex items-center gap-1.5 font-mono text-[9px] font-bold tracking-[0.22em] text-teal">
                  <Icon name="chat" className="h-3 w-3" /> MEDLENS-NLP
                </span>
              )}
              {m.text}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex justify-start">
            <div className="border border-teal/30 bg-paper px-3.5 py-2.5">
              <span className="flex gap-1.5">
                {[0, 1, 2].map((d) => (
                  <span
                    key={d}
                    className="h-1.5 w-1.5 rounded-full bg-teal blink-soft"
                    style={{ animationDelay: `${d * 220}ms` }}
                  />
                ))}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {QUICK.map((q) => (
          <button
            key={q}
            onClick={() => send(q)}
            disabled={typing}
            className="border border-ink/20 bg-paper px-2.5 py-1 font-mono text-[11px] text-inksoft transition-all duration-200 hover:border-teal hover:text-teal hover:-translate-y-px disabled:opacity-40"
          >
            {q}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-3 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about CNNs, transfer learning, metrics, triage…"
          aria-label="Ask the medical NLP desk"
          className="min-w-0 flex-1 border-2 border-ink/25 bg-paper px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-inksoft/50 focus:border-teal"
        />
        <button
          type="submit"
          disabled={!input.trim() || typing}
          className="inline-flex items-center gap-1.5 bg-pine px-4 py-2.5 font-display text-xs font-extrabold uppercase tracking-wider text-paper transition-all duration-200 hover:bg-teal disabled:opacity-40"
        >
          <Icon name="arrow" className="h-3.5 w-3.5" /> Send
        </button>
      </form>
    </div>
  );
}
