import { useState } from "react";
import { SYMPTOMS, DISEASES, RED_FLAG_SINGLE } from "../data/medical";

interface Props {
  onComplete: (result: any) => void;
}

export function SymptomChecker({ onComplete }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(["fever", "cough"]));
  const [duration, setDuration] = useState(1);
  const [severity, setSeverity] = useState(5);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const analyze = () => {
    if (selected.size === 0) return;

    const scores = DISEASES.map((d) => {
      let score = d.base;
      for (const id of selected) {
        const w = d.weights[id];
        if (w) score += w;
      }
      return { disease: d, score };
    });

    const max = Math.max(...scores.map((s) => s.score));
    const exps = scores.map((s) => Math.exp((s.score - max) / 2.1));
    const sum = exps.reduce((a, b) => a + b, 0);

    const results = scores
      .map((s, i) => ({
        disease: s.disease,
        confidence: (exps[i] / sum) * 100,
      }))
      .sort((a, b) => b.confidence - a.confidence);

    const redFlags = [...selected].filter((id) => RED_FLAG_SINGLE.includes(id));

    onComplete({
      results,
      redFlags,
      duration: ["< 24 hours", "1–3 days", "4–7 days", "> 1 week"][duration],
      severity,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="font-display text-sm font-extrabold uppercase tracking-wide text-ink">Chief complaints</h3>
          <span className="font-mono text-xs text-inksoft">{selected.size} / {SYMPTOMS.length} selected</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {SYMPTOMS.map((s) => {
            const on = selected.has(s.id);
            return (
              <button
                key={s.id}
                onClick={() => toggle(s.id)}
                className={`group inline-flex items-center gap-1.5 border px-2.5 py-1.5 text-[13px] font-medium transition-all duration-200 ${
                  on
                    ? "border-teal bg-teal text-paper shadow-[3px_3px_0_0_rgba(11,47,45,0.9)]"
                    : "border-ink/20 bg-paper text-ink hover:border-teal hover:text-teal"
                }`}
              >
                <span className={`grid h-3.5 w-3.5 place-items-center border ${on ? "border-paper/60" : "border-ink/30"}`}>
                  {on && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-2.5 w-2.5">
                      <path d="m4.5 12.5 5 5 10-11" />
                    </svg>
                  )}
                </span>
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-5 border-t border-dashed border-ink/20 pt-5 sm:grid-cols-2">
        <div>
          <p className="mb-2 font-mono text-[10px] font-semibold tracking-[0.22em] text-teal uppercase">── Duration</p>
          <div className="flex flex-wrap gap-1.5">
            {["< 24 hours", "1–3 days", "4–7 days", "> 1 week"].map((d, i) => (
              <button
                key={d}
                onClick={() => setDuration(i)}
                className={`border px-3 py-1.5 font-mono text-xs transition-all duration-200 ${
                  duration === i
                    ? "border-ink bg-ink text-paper shadow-[3px_3px_0_0_rgba(14,124,114,0.9)]"
                    : "border-ink/20 bg-paper text-inksoft hover:border-ink hover:text-ink"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 flex items-center justify-between font-mono text-[10px] font-semibold tracking-[0.22em] text-teal uppercase">
            <span>── Severity</span>
            <span className="text-base font-bold tabular-nums text-ink">{severity}/10</span>
          </p>
          <input
            type="range"
            min={1}
            max={10}
            value={severity}
            onChange={(e) => setSeverity(Number(e.target.value))}
            className="w-full accent-teal"
          />
        </div>
      </div>

      <button
        onClick={analyze}
        disabled={selected.size === 0}
        className="group inline-flex w-full items-center justify-center gap-2 bg-alert px-6 py-3.5 font-display text-sm font-extrabold uppercase tracking-wider text-paper shadow-[5px_5px_0_0_rgba(11,47,45,1)] transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <path d="M9.5 3a3 3 0 0 0-3 3 3.2 3.2 0 0 0-2.4 5A3.2 3.2 0 0 0 6.5 16a3 3 0 0 0 3 3 2.8 2.8 0 0 0 2.5-1.5V4.5A3 3 0 0 0 9.5 3zM14.5 3a3 3 0 0 1 3 3 3.2 3.2 0 0 1 2.4 5 3.2 3.2 0 0 1-2.4 5 3 3 0 0 1-3 3 2.8 2.8 0 0 1-2.5-1.5V4.5A3 2.8 0 0 1 14.5 3z" />
        </svg>
        Run neural analysis
      </button>
    </div>
  );
}
