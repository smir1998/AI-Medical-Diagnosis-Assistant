import { useEffect, useState } from "react";
import { PIPELINE_STAGES } from "../data/medical";
import { Icon } from "./ui";

/* ---------- live system-architecture pipeline ---------- */

export function PipelinePanel({ stage, running }: { stage: number; running: boolean }) {
  return (
    <div className="dark-grid border border-pine p-4 text-paper">
      <p className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold tracking-[0.22em] text-mint/80">
        <Icon name="layers" className="h-3.5 w-3.5" /> SYSTEM ARCHITECTURE
        <span
          className={`ml-auto inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] tracking-widest ${
            running ? "bg-alert text-paper" : "bg-mint/15 text-mint"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${running ? "blink-soft bg-paper" : "bg-mint"}`} />
          {running ? "RUNNING" : "IDLE"}
        </span>
      </p>

      <ol className="space-y-0">
        {PIPELINE_STAGES.map((s, i) => {
          const done = stage > i || (!running && stage >= 4);
          const active = running && stage === i;
          return (
            <li key={s.id} className="relative pl-7 pb-3 last:pb-0">
              {i < PIPELINE_STAGES.length - 1 && (
                <span
                  className={`absolute left-[9px] top-5 h-[calc(100%-14px)] w-px ${
                    done ? "bg-mint/70" : "bg-mint/20"
                  }`}
                />
              )}
              <span
                className={`absolute left-0 top-0.5 grid h-[19px] w-[19px] place-items-center border font-mono text-[9px] font-bold transition-all duration-300 ${
                  active
                    ? "border-mint bg-mint text-pine shadow-[0_0_10px_rgba(143,227,207,0.8)]"
                    : done
                      ? "border-mint/70 bg-mint/15 text-mint"
                      : "border-mint/25 text-mint/40"
                }`}
              >
                {done && !active ? "✓" : i + 1}
              </span>
              <p
                className={`font-mono text-[11px] font-semibold leading-tight transition-colors duration-300 ${
                  active ? "text-mint" : done ? "text-paper/90" : "text-paper/45"
                }`}
              >
                {s.label}
                {active && <span className="blink-soft ml-1">▮</span>}
              </p>
              <p className="font-mono text-[9px] tracking-wider text-paper/35">{s.detail}</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ---------- model vitals ---------- */

export function ModelVitals() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 2200);
    return () => window.clearInterval(id);
  }, []);

  const latency = 34 + ((tick * 7) % 13);
  const gpu = 41 + ((tick * 11) % 17);
  const uptime = 18400 + tick * 2;
  const fmtUp = `${Math.floor(uptime / 3600)}h ${String(Math.floor((uptime % 3600) / 60)).padStart(2, "0")}m`;

  const rows = [
    { label: "PneumoNet v3", acc: 94.2 },
    { label: "DermaScan", acc: 91.5 },
    { label: "SymptomEncoder", acc: 88.4 },
  ];

  return (
    <div className="border border-ink/20 bg-paper p-4">
      <p className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold tracking-[0.22em] text-inksoft">
        <Icon name="pulse" className="h-3.5 w-3.5 text-teal" /> MODEL VITALS
        <span className="ml-auto font-mono text-[9px] text-teal">uptime {fmtUp}</span>
      </p>

      <div className="space-y-2.5">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="flex justify-between font-mono text-[10px]">
              <span className="font-semibold text-ink">{r.label}</span>
              <span className="tabular-nums text-teal">{r.acc.toFixed(1)}%</span>
            </div>
            <div className="mt-1 h-1.5 bg-ink/10">
              <div className="bar-fill h-full bg-teal" style={{ width: `${r.acc}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3.5 grid grid-cols-2 gap-2 border-t border-dashed border-ink/15 pt-3 font-mono text-[10px]">
        <div className="border border-ink/10 bg-paperdeep/60 px-2 py-1.5">
          <p className="text-[9px] tracking-widest text-inksoft/70">LATENCY</p>
          <p className="tabular-nums font-bold text-ink">{latency} ms</p>
        </div>
        <div className="border border-ink/10 bg-paperdeep/60 px-2 py-1.5">
          <p className="text-[9px] tracking-widest text-inksoft/70">GPU·SIM MEM</p>
          <p className="tabular-nums font-bold text-ink">{gpu}%</p>
        </div>
      </div>
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
