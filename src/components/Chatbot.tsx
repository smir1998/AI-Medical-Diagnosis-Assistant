import { useState } from "react";
import { CHAT_KB, CHAT_FALLBACK } from "../data/medical";

export function Chatbot() {
  const [messages, setMessages] = useState([
    { role: "bot", text: "MedLens NLP desk online. Ask about CNNs, normalization, transfer learning, or when to see a doctor." },
  ]);
  const [input, setInput] = useState("");

  const send = (text: string) => {
    if (!text.trim()) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");

    // Simple keyword matching
    const q = text.toLowerCase();
    let best = { score: 0, answer: CHAT_FALLBACK };
    for (const entry of CHAT_KB) {
      let score = 0;
      for (const k of entry.keys) {
        if (q.includes(k)) score += k.length;
      }
      if (score > best.score) best = { score, answer: entry.answer };
    }

    setTimeout(() => {
      setMessages((m) => [...m, { role: "bot", text: best.answer }]);
    }, 500);
  };

  return (
    <div className="flex h-[520px] flex-col">
      <div className="chat-scroll flex-1 space-y-3 overflow-y-auto border border-ink/15 bg-paperdeep/50 p-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] border px-3.5 py-2.5 text-[13px] leading-relaxed ${
                m.role === "user"
                  ? "border-ink bg-ink text-paper"
                  : "border-teal/30 bg-paper text-ink shadow-[3px_3px_0_0_rgba(14,124,114,0.15)]"
              }`}
            >
              {m.text}
            </div>
          </div>
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
          className="min-w-0 flex-1 border-2 border-ink/25 bg-paper px-3.5 py-2.5 text-sm outline-none focus:border-teal"
        />
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 bg-pine px-4 py-2.5 font-display text-xs font-extrabold uppercase tracking-wider text-paper transition-all duration-200 hover:bg-teal"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
            <path d="M4 12h15M13 6l6 6-6 6" />
          </svg>
          Send
        </button>
      </form>
    </div>
  );
}
