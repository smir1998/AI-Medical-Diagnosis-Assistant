import { useEffect, useState } from "react";
import { PIPELINE_STAGES } from "../data/medical";
import { Icon } from "./ui";

/* ---------- live system architecture ---------- */

export function PipelinePanel({ stage, running }: { stage: number; running: boolean }) {
  return (
    <div className="border border-ink/20 bg-paper p-4">
      <p className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold tracking-[0.22em] text-inksoft">
        <Icon name="layers" className="h-3.5 w-3.5 text-teal" /> SYSTEM ARCHITECTURE
        <span
          className={`ml-auto font-mono text-[9px] tracking-widest ${
            running ? "blink-soft text-alert" : "text-teal"
          }`}
        >
          {running ? "● LIVE" : "IDLE"}
        </span>
      </p>
      <ol className="relative space-y-0.5">
        {PIPELINE_STAGES.map((s, i) => {
          const active = running && stage === i;
          const done = stage > i || (!running && stage >= PIPELINE_STAGES.length - 1 && stage === 4);
          return (
            <li key={s.id} className="relative flex items-stretch gap-3">
              {/* connector */}
              <span className="flex flex-col items-center">
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center border font-mono text-[10px] font-bold transition-all duration-300 ${
                    active
                      ? "border-alert bg-alert text-paper shadow-[0_0_0_3px_rgba(199,70,60,0.18)]"
                      : done
                        ? "border-teal bg-teal text-paper"
                        : "border-ink/25 bg-paper text-inksoft"
                  }`}
                >
                  {done && !active ? <Icon name="check" className="h-3 w-3" /> : i + 1}
                </span>
                {i < PIPELINE_STAGES.length - 1 && (
                  <span className={`w-px flex-1 ${done || active ? "bg-teal/50" : "bg-ink/15"}`} />
                )}
              </span>
              <span
                className={`pb-3 transition-colors duration-300 ${
                  active ? "text-ink" : done ? "text-ink/80" : "text-inksoft/70"
                }`}
              >
                <span className="block font-display text-[12px] font-extrabold uppercase tracking-wide leading-6">
                  {s.label}
                </span>
                <span className="block font-mono text-[9px] tracking-wider text-inksoft">{s.detail}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ---------- model vitals ---------- */

export function ModelVitals() {
  const [uptime, setUptime] = useState(0);
  const [latency, setLatency] = useState(184);

  useEffect(() => {
    const t0 = Date.now();
    const id = window.setInterval(() => {
      setUptime(Math.floor((Date.now() - t0) / 1000));
      setLatency(160 + Math.floor(Math.random() * 60));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const mm = String(Math.floor(uptime / 60)).padStart(2, "0");
  const ss = String(uptime % 60).padStart(2, "0");

  return (
    <div className="border border-ink/20 bg-paper p-4">
      <p className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold tracking-[0.22em] text-inksoft">
        <Icon name="pulse" className="h-3.5 w-3.5 text-teal" /> MODEL VITALS
      </p>
      <dl className="space-y-2 font-mono text-[11px]">
        {[
          { k: "Session uptime", v: `${mm}:${ss}` },
          { k: "Inference latency", v: `${latency} ms` },
          { k: "Models loaded", v: "4 / 4" },
          { k: "Data egress", v: "0 bytes" },
          { k: "Triage policy", v: "RECALL-FIRST" },
        ].map((row) => (
          <div key={row.k} className="flex items-baseline justify-between gap-3 border-b border-dashed border-ink/10 pb-1.5">
            <dt className="text-inksoft">{row.k}</dt>
            <dd className="font-bold tabular-nums text-ink">{row.v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* ---------- session log ---------- */

export interface HistoryEntry {
  id: number;
  time: string;
  type: "symptom" | "image" | "derm" | "adm";
  title: string;
  confidence: number; // -1 → not applicable (e.g. admissions)
  mrn?: string; // the chart on record when the run happened
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
                      : e.type === "adm"
                        ? "bg-ink/10 text-ink"
                        : "bg-teal/15 text-teal"
                }`}
              >
                <Icon
                  name={
                    e.type === "image" ? "scan" : e.type === "derm" ? "scope" : e.type === "adm" ? "user" : "stetho"
                  }
                  className="h-3.5 w-3.5"
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold">{e.title}</span>
                <span className="font-mono text-[9px] tracking-wider text-inksoft/70">
                  {e.time} ·{" "}
                  {e.type === "image"
                    ? "CNN"
                    : e.type === "derm"
                      ? "CNN-DERM"
                      : e.type === "adm"
                        ? "REGISTRAR"
                        : "NLP-SYMPTOMS"}
                  {e.mrn && (
                    <span className="ml-1.5 border border-teal/40 bg-teal/10 px-1 py-px font-bold text-teal">
                      {e.mrn}
                    </span>
                  )}
                </span>
              </span>
              <span className="font-mono text-[11px] font-bold tabular-nums text-teal">
                {e.confidence >= 0 ? `${e.confidence.toFixed(1)}%` : "—"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
