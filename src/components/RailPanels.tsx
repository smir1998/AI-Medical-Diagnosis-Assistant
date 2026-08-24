import { MODEL_CARDS, PIPELINE_STAGES } from "../data/medical";
import { CountUp, Icon } from "./ui";

/* ---------- pipeline ---------- */

export function PipelinePanel({ stage, running }: { stage: number; running: boolean }) {
  return (
    <div className="dark-grid border border-pine p-4">
      <p className="mb-3 flex items-center justify-between font-mono text-[10px] font-bold tracking-[0.22em] text-mint/70">
        <span>SYSTEM ARCHITECTURE</span>
        <span className={running ? "text-mint blink-soft" : "text-mint/35"}>
          {running ? "● LIVE" : "○ IDLE"}
        </span>
      </p>
      <ol className="space-y-0">
        {PIPELINE_STAGES.map((s, i) => {
          const done = running && i < stage;
          const active = running && i === stage;
          return (
            <li key={s.id}>
              <div
                className={`flex items-center gap-3 border px-3 py-2 transition-all duration-300 ${
                  active
                    ? "border-mint bg-mint/15 -translate-x-0 shadow-[3px_3px_0_0_rgba(127,216,200,0.25)]"
                    : done
                      ? "border-mint/40 bg-mint/5"
                      : "border-mint/15"
                }`}
              >
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center border font-mono text-[10px] font-bold ${
                    active
                      ? "border-mint bg-mint text-pine"
                      : done
                        ? "border-mint/60 text-mint"
                        : "border-mint/25 text-mint/40"
                  }`}
                >
                  {done ? <Icon name="check" className="h-3 w-3" /> : i + 1}
                </span>
                <span className="min-w-0">
                  <span
                    className={`block font-display text-xs font-bold uppercase tracking-wide ${
                      active ? "text-mint" : done ? "text-paper" : "text-paper/55"
                    }`}
                  >
                    {s.label}
                  </span>
                  <span className="block truncate font-mono text-[9px] text-mint/50">{s.detail}</span>
                </span>
                {active && <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-mint blink-soft" />}
              </div>
              {i < PIPELINE_STAGES.length - 1 && (
                <div className="ml-[26px] h-3 w-px bg-mint/25" aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ---------- model vitals ---------- */

export function ModelVitals() {
  return (
    <div className="border border-ink/20 bg-paper p-4">
      <p className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold tracking-[0.22em] text-inksoft">
        <Icon name="pulse" className="h-3.5 w-3.5 text-alert" /> MODEL VITALS
      </p>
      <div className="space-y-3">
        {MODEL_CARDS.map((m) => (
          <div key={m.name} className="group border border-ink/12 p-3 transition-all duration-300 hover:border-teal hover:-translate-y-0.5">
            <p className="flex items-baseline justify-between">
              <span className="font-display text-[13px] font-extrabold">{m.name}</span>
              <CountUp value={m.acc} decimals={1} suffix="%" className="font-mono text-sm font-bold text-teal" />
            </p>
            <p className="font-mono text-[9px] tracking-wider text-inksoft/70">{m.arch}</p>
            <div className="mt-2 h-1.5 bg-ink/10">
              <div className="bar-fill h-full bg-teal" style={{ width: `${m.acc}%` }} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 flex items-center justify-between border-t border-dashed border-ink/15 pt-2.5 font-mono text-[9px] tracking-widest text-inksoft">
        <span>RECALL-FIRST TRIAGE</span>
        <span className="text-teal font-bold">R 95.1</span>
      </p>
    </div>
  );
}

/* ---------- session log ---------- */

export interface HistoryEntry {
  id: number;
  time: string;
  type: "symptom" | "image" | "derm";
  title: string;
  confidence: number;
}

export function HistoryPanel({ entries }: { entries: HistoryEntry[] }) {
  return (
    <div className="border border-ink/20 bg-paper p-4">
      <p className="mb-2.5 flex items-center gap-2 font-mono text-[10px] font-bold tracking-[0.22em] text-inksoft">
        <Icon name="clock" className="h-3.5 w-3.5 text-teal" /> SESSION LOG
        <span className="ml-auto bg-ink px-1.5 py-0.5 text-paper">{entries.length}</span>
      </p>
      {entries.length === 0 ? (
        <p className="py-3 text-center font-mono text-[11px] text-inksoft/50">
          no analyses yet —
          <span className="block">run a lab to populate</span>
        </p>
      ) : (
        <ul className="log-scroll max-h-[240px] space-y-1.5 overflow-y-auto pr-1">
          {entries.map((e) => (
            <li
              key={e.id}
              className="group flex items-center gap-2.5 border border-ink/10 bg-paperdeep/40 px-2.5 py-2 transition-colors hover:border-teal/50"
            >
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center ${
                  e.type === "image"
                    ? "bg-alert/15 text-alert"
                    : e.type === "derm"
                      ? "bg-amber/25 text-ink"
                      : "bg-teal/15 text-teal"
                }`}
              >
                <Icon
                  name={e.type === "image" ? "scan" : e.type === "derm" ? "scope" : "stetho"}
                  className="h-3.5 w-3.5"
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold">{e.title}</span>
                <span className="font-mono text-[9px] tracking-wider text-inksoft/70">
                  {e.time} · {e.type === "image" ? "CNN" : e.type === "derm" ? "CNN-DERM" : "NLP-SYMPTOMS"}
                </span>
              </span>
              <span className="font-mono text-[11px] font-bold tabular-nums text-teal">
                {e.confidence.toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
