import { useEffect, useMemo, useRef, useState } from "react";
import { DURATIONS, SYMPTOMS, SYMPTOM_GROUPS } from "../data/medical";
import { analyzeSymptoms, prefersReducedMotion, sleep } from "../lib/engine";
import type { SymptomResult } from "../lib/engine";
import { CountUp, Icon } from "./ui";

const RUN_SCRIPT = [
  { stage: 0, line: "▸ encoding symptom vector … 24-dim binary" },
  { stage: 0, line: "▸ duration × severity weighting applied" },
  { stage: 1, line: "▸ embedding layer → 12 disease prototypes" },
  { stage: 2, line: "▸ attention over 12 profiles · temp=2.1" },
  { stage: 3, line: "▸ softmax → posterior probabilities" },
  { stage: 3, line: "▸ red-flag rule engine … scanning" },
  { stage: 4, line: "✓ inference complete — compiling report" },
];

const PRESETS: { label: string; note: string; ids: string[]; durationIdx: number; severity: number }[] = [
  {
    label: "Flu-like",
    note: "classic viral",
    ids: ["fever", "cough", "muscle_aches", "fatigue", "chills"],
    durationIdx: 1,
    severity: 6,
  },
  {
    label: "Cardiac alarm",
    note: "red-flag demo",
    ids: ["chest_pain", "shortness_breath", "fatigue"],
    durationIdx: 0,
    severity: 9,
  },
  {
    label: "GI bug",
    note: "dehydration watch",
    ids: ["diarrhea", "vomiting", "nausea", "abdominal_pain"],
    durationIdx: 1,
    severity: 5,
  },
  {
    label: "Neuro",
    note: "headache workup",
    ids: ["headache", "nausea", "dizziness"],
    durationIdx: 2,
    severity: 6,
  },
];

/* keyword map: chief-complaint free text → symptom ids */
const CC_HINTS: { re: RegExp; ids: string[] }[] = [
  { re: /fever|febrile|temp|chill/i, ids: ["fever", "chills"] },
  { re: /cough/i, ids: ["cough"] },
  { re: /throat/i, ids: ["sore_throat"] },
  { re: /head|migraine/i, ids: ["headache"] },
  { re: /breath|wheeze|asthma/i, ids: ["shortness_breath"] },
  { re: /chest/i, ids: ["chest_pain"] },
  { re: /stomach|abdom|tummy|belly|cramp/i, ids: ["abdominal_pain"] },
  { re: /vomit|throw/i, ids: ["vomiting"] },
  { re: /nausea|queasy/i, ids: ["nausea"] },
  { re: /diarr|loose/i, ids: ["diarrhea"] },
  { re: /rash/i, ids: ["rash"] },
  { re: /itch/i, ids: ["itching"] },
  { re: /urin|pee|dysuria/i, ids: ["burning_urination"] },
  { re: /joint/i, ids: ["joint_pain"] },
  { re: /muscle|ache/i, ids: ["muscle_aches"] },
  { re: /dizz|vertigo|faint/i, ids: ["dizziness"] },
  { re: /tired|fatigue|weak|exhaust/i, ids: ["fatigue"] },
  { re: /nose|sneez|allerg|hay/i, ids: ["runny_nose", "sneezing"] },
  { re: /sweat/i, ids: ["night_sweats"] },
  { re: /weight/i, ids: ["weight_loss"] },
  { re: /taste|smell/i, ids: ["loss_taste"] },
];

export function ccToSymptoms(cc: string): string[] {
  const out = new Set<string>();
  for (const h of CC_HINTS) if (h.re.test(cc)) h.ids.forEach((i) => out.add(i));
  return [...out];
}

interface Props {
  onComplete: (r: SymptomResult) => void;
  onPipeline: (stage: number, running: boolean) => void;
  chiefComplaint?: string;
}

export function SymptomChecker({ onComplete, onPipeline, chiefComplaint }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(["fever", "cough", "fatigue"]));
  const [durationIdx, setDurationIdx] = useState(1);
  const [severity, setSeverity] = useState(5);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [result, setResult] = useState<SymptomResult | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const ccMatches = useMemo(
    () => (chiefComplaint && chiefComplaint !== "—" ? ccToSymptoms(chiefComplaint) : []),
    [chiefComplaint]
  );

  const applyCc = () => {
    if (running || ccMatches.length === 0) return;
    setSelected((prev) => new Set([...prev, ...ccMatches]));
    setResult(null);
  };

  const toggle = (id: string) => {
    if (running) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setResult(null);
  };

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    if (running) return;
    setSelected(new Set(p.ids));
    setDurationIdx(p.durationIdx);
    setSeverity(p.severity);
    setResult(null);
  };

  const run = async () => {
    if (running || selected.size === 0) return;
    const reduced = prefersReducedMotion();
    setRunning(true);
    setResult(null);
    setLog([]);
    for (let i = 0; i < RUN_SCRIPT.length; i++) {
      const step = RUN_SCRIPT[i];
      onPipeline(step.stage, true);
      setLog((prev) => [...prev, step.line]);
      if (!reduced) await sleep(i === 0 ? 260 : 330);
      if (!alive.current) return;
    }
    const res = analyzeSymptoms([...selected], durationIdx, severity);
    setResult(res);
    onComplete(res);
    onPipeline(4, false);
    setRunning(false);
  };

  const groups = SYMPTOM_GROUPS.map((g) => ({
    group: g,
    items: SYMPTOMS.filter((s) => s.group === g),
  }));

  return (
    <div className="space-y-6">
      {/* chart cross-link — pulls symptoms from the active patient's chief complaint */}
      {ccMatches.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-2 border-teal/45 bg-teal/10 px-3.5 py-2.5">
          <Icon name="stetho" className="h-4 w-4 shrink-0 text-teal" />
          <span className="min-w-0 font-mono text-[10px] leading-relaxed tracking-wider text-inksoft">
            CHART CC <span className="font-bold text-ink">“{chiefComplaint}”</span> → {ccMatches.length} matching
            symptom{ccMatches.length > 1 ? "s" : ""} in the 24-dim vector
          </span>
          <button
            onClick={applyCc}
            disabled={running}
            className="ml-auto inline-flex shrink-0 items-center gap-1.5 border border-teal bg-paper px-2.5 py-1 font-mono text-[9px] font-bold tracking-[0.18em] text-teal transition-all duration-200 hover:-translate-y-px hover:bg-teal hover:text-paper disabled:opacity-40"
          >
            <Icon name="arrow" className="h-3 w-3" /> PULL INTO VECTOR
          </button>
        </div>
      )}

      {/* scenario presets */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] font-bold tracking-[0.22em] text-inksoft uppercase">
          Scenario presets
        </span>
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => applyPreset(p)}
            disabled={running}
            title={`${p.ids.length} symptoms · ${p.note}`}
            className="group border border-ink/25 bg-paperdeep/50 px-3 py-1.5 text-left transition-all duration-200 hover:-translate-y-px hover:border-teal hover:bg-teal/10 disabled:opacity-50"
          >
            <span className="block font-display text-[12px] font-extrabold uppercase tracking-wide leading-none">
              {p.label}
            </span>
            <span className="mt-0.5 block font-mono text-[9px] text-inksoft">{p.note}</span>
          </button>
        ))}
        <button
          onClick={() => {
            if (running) return;
            setSelected(new Set());
            setResult(null);
          }}
          disabled={running}
          className="border border-ink/25 px-3 py-1.5 font-mono text-[10px] font-semibold tracking-widest text-inksoft uppercase transition-all duration-200 hover:border-alert hover:text-alert disabled:opacity-50"
        >
          Clear all
        </button>
      </div>

      {/* intake form */}
      <div>
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="font-display text-sm font-extrabold uppercase tracking-wide text-ink">
            Chief complaints
          </h3>
          <span className="font-mono text-xs text-inksoft">
            {selected.size} / {SYMPTOMS.length} selected
          </span>
        </div>

        <div className="space-y-4">
          {groups.map(({ group, items }) => (
            <div key={group}>
              <p className="mb-1.5 font-mono text-[10px] font-semibold tracking-[0.22em] text-teal uppercase">
                ── {group}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {items.map((s) => {
                  const on = selected.has(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggle(s.id)}
                      disabled={running}
                      aria-pressed={on}
                      className={`group inline-flex items-center gap-1.5 border px-2.5 py-1.5 text-[13px] font-medium transition-all duration-200 disabled:opacity-50 ${
                        on
                          ? "border-teal bg-teal text-paper shadow-[3px_3px_0_0_rgba(11,47,45,0.9)] -translate-y-px"
                          : "border-ink/20 bg-paper text-ink hover:border-teal hover:text-teal hover:-translate-y-px"
                      }`}
                    >
                      <span
                        className={`grid h-3.5 w-3.5 place-items-center border ${
                          on ? "border-paper/60" : "border-ink/30 group-hover:border-teal"
                        }`}
                      >
                        {on && <Icon name="check" className="h-2.5 w-2.5" />}
                      </span>
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* one-hot encoding readout */}
      <div className="border border-ink/15 bg-paperdeep/40 p-3">
        <p className="mb-2 flex items-center justify-between font-mono text-[10px] font-bold tracking-[0.22em] text-inksoft uppercase">
          <span className="flex items-center gap-1.5">
            <Icon name="layers" className="h-3.5 w-3.5 text-teal" /> Input tensor · one-hot
          </span>
          <span className="tabular-nums text-teal">
            Σ = {selected.size} / {SYMPTOMS.length}
          </span>
        </p>
        <div className="flex flex-wrap gap-[3px]" aria-hidden="true">
          {SYMPTOMS.map((s, i) => {
            const on = selected.has(s.id);
            return (
              <span
                key={s.id}
                title={`${s.label} = ${on ? 1 : 0}`}
                style={{ transitionDelay: `${i * 18}ms` }}
                className={`h-4 w-3 transition-all duration-300 ${
                  on
                    ? running
                      ? "cell-scan"
                      : "bg-teal shadow-[0_0_6px_rgba(14,124,114,0.5)]"
                    : "bg-ink/15"
                }`}
              />
            );
          })}
        </div>
        <p className="mt-2 font-mono text-[9px] tracking-wider text-inksoft/70">
          [ {SYMPTOMS.map((s) => (selected.has(s.id) ? 1 : 0)).join(" ")} ] — the exact 24-dim vector the
          encoder receives
        </p>
      </div>

      {/* duration + severity */}
      <div className="grid gap-5 border-t border-dashed border-ink/20 pt-5 sm:grid-cols-2">
        <div>
          <p className="mb-2 font-mono text-[10px] font-semibold tracking-[0.22em] text-teal uppercase">
            ── Duration
          </p>
          <div className="flex flex-wrap gap-1.5">
            {DURATIONS.map((d, i) => (
              <button
                key={d}
                onClick={() => setDurationIdx(i)}
                disabled={running}
                className={`border px-3 py-1.5 font-mono text-xs transition-all duration-200 disabled:opacity-50 ${
                  durationIdx === i
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
            disabled={running}
            onChange={(e) => setSeverity(Number(e.target.value))}
            className="w-full accent-teal"
            aria-label="Symptom severity from 1 to 10"
          />
          <div className="flex justify-between font-mono text-[10px] text-inksoft/70">
            <span>mild</span>
            <span>incapacitating</span>
          </div>
        </div>
      </div>

      {/* run button + inference log */}
      <div className="flex flex-col gap-4 border-t border-dashed border-ink/20 pt-5 sm:flex-row">
        <button
          onClick={run}
          disabled={running || selected.size === 0}
          className={`group relative inline-flex shrink-0 items-center justify-center gap-2 px-6 py-3.5 font-display text-sm font-extrabold uppercase tracking-wider transition-all duration-200 ${
            running || selected.size === 0
              ? "cursor-not-allowed border border-ink/20 bg-paperdeep text-ink/40"
              : "bg-alert text-paper shadow-[5px_5px_0_0_rgba(11,47,45,1)] hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_rgba(11,47,45,1)] active:translate-y-0 active:shadow-[3px_3px_0_0_rgba(11,47,45,1)]"
          }`}
        >
          {running ? (
            <>
              <Icon name="layers" className="h-4 w-4 spin-slow" /> Inferring…
            </>
          ) : (
            <>
              <Icon name="brain" className="h-4 w-4 transition-transform group-hover:scale-110" />
              Run neural analysis
            </>
          )}
        </button>

        <div className="dark-grid min-h-[92px] flex-1 border border-pine px-4 py-3 font-mono text-xs leading-relaxed text-mint">
          {log.length === 0 && !running && (
            <span className="text-mint/40">// inference trace will stream here …</span>
          )}
          {log.map((l, i) => (
            <p key={i} className={i === log.length - 1 && running ? "type-caret" : ""}>
              {l}
            </p>
          ))}
        </div>
      </div>

      {/* results */}
      {result && (
        <div className="space-y-4 border-t border-dashed border-ink/20 pt-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-extrabold uppercase tracking-wide">
              Differential diagnosis <span className="text-inksoft">· run {result.meta.runId}</span>
            </h3>
            <span className="font-mono text-[10px] uppercase tracking-widest text-teal">softmax · T=2.1</span>
          </div>

          {result.redFlags.length > 0 && (
            <div className="border-2 border-alert bg-alert/10 p-3.5">
              <p className="mb-1.5 flex items-center gap-2 font-display text-xs font-extrabold uppercase tracking-wider text-alert">
                <Icon name="warn" className="h-4 w-4" /> Red flags detected — seek in-person care
              </p>
              <ul className="space-y-1 pl-6 text-[13px] text-alertdeep">
                {result.redFlags.map((f) => (
                  <li key={f} className="list-disc">
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ol className="space-y-3">
            {result.scored.slice(0, 4).map((s, rank) => (
              <li
                key={s.disease.id}
                className={`border p-3.5 transition-all duration-300 hover:-translate-y-0.5 ${
                  rank === 0
                    ? "border-teal bg-teal/8 shadow-[5px_5px_0_0_rgba(14,124,114,0.25)]"
                    : "border-ink/15 bg-paper"
                }`}
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className={`font-mono text-[10px] font-bold ${rank === 0 ? "text-teal" : "text-inksoft/60"}`}>
                    #{rank + 1}
                  </span>
                  <span className="font-display text-base font-extrabold">{s.disease.name}</span>
                  <span className="font-mono text-[10px] tracking-widest text-inksoft">ICD-10 {s.disease.code}</span>
                  <span
                    className={`ml-auto border px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-widest uppercase ${
                      s.disease.severity === "High"
                        ? "border-alert/40 text-alert"
                        : s.disease.severity === "Moderate"
                          ? "border-amber/50 text-amber"
                          : "border-teal/40 text-teal"
                    }`}
                  >
                    {s.disease.severity} risk
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-2 flex-1 bg-ink/10">
                    <div
                      className={`bar-fill h-full ${rank === 0 ? "bg-teal" : "bg-ink/35"}`}
                      style={{ width: `${Math.min(99, s.confidence * 2.2)}%`, animationDelay: `${rank * 120}ms` }}
                    />
                  </div>
                  <CountUp
                    value={s.confidence}
                    decimals={1}
                    suffix="%"
                    className={`w-16 text-right font-mono text-sm font-bold tabular-nums ${
                      rank === 0 ? "text-teal" : "text-inksoft"
                    }`}
                  />
                </div>
                {rank === 0 && (
                  <p className="mt-2.5 border-l-2 border-teal pl-3 text-[13px] leading-relaxed text-inksoft">
                    {s.disease.blurb} <span className="font-semibold text-ink">Referral: {s.disease.specialty}.</span>
                  </p>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
