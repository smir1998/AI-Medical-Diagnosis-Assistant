import { useState } from "react";
import { Icon, SectionTag } from "./ui";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface Vitals {
  hr?: number;
  sys?: number;
  dia?: number;
  spo2?: number;
  temp?: number;
}

export interface Patient {
  id: string; // MRN
  name: string;
  age: number;
  sex: "F" | "M" | "X";
  complaint: string; // chief complaint
  allergies: string;
  triage: number; // CTAS 1..5
  vitals: Vitals;
  flags: string[]; // clinical flags raised by vitals
  status: "admitted" | "discharged";
  admittedAt: string;
}

export interface IntakeDraft {
  name: string;
  age: string;
  sex: "F" | "M" | "X";
  complaint: string;
  allergies: string;
  triage: number;
  hr: string;
  sys: string;
  dia: string;
  spo2: string;
  temp: string;
}

export const TRIAGE_META: Record<number, { label: string; cls: string }> = {
  1: { label: "RESUS", cls: "bg-alert text-paper border-alert" },
  2: { label: "EMERGENT", cls: "bg-alertdeep text-paper border-alertdeep" },
  3: { label: "URGENT", cls: "bg-amber text-paper border-amber" },
  4: { label: "LESS URGENT", cls: "bg-teal text-paper border-teal" },
  5: { label: "MINOR", cls: "bg-ink/10 text-ink border-ink/30" },
};

const EMPTY: IntakeDraft = {
  name: "",
  age: "",
  sex: "F",
  complaint: "",
  allergies: "NKDA",
  triage: 3,
  hr: "",
  sys: "",
  dia: "",
  spo2: "",
  temp: "",
};

/* ------------------------------------------------------------------ */
/*  Pure logic (exported for the QA bench)                             */
/* ------------------------------------------------------------------ */

export function genMRN(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `MRN-${s}`;
}

/** Clinical flag engine over captured vitals. */
export function computeVitalsFlags(v: Vitals): string[] {
  const flags: string[] = [];
  if (v.spo2 !== undefined && v.spo2 < 94) flags.push("Hypoxia");
  if (v.hr !== undefined && v.hr > 120) flags.push("Tachycardia");
  if (v.hr !== undefined && v.hr < 50) flags.push("Bradycardia");
  if (v.temp !== undefined && v.temp >= 38) flags.push("Febrile");
  if (v.sys !== undefined && v.sys < 90) flags.push("Hypotension");
  if ((v.sys !== undefined && v.sys >= 180) || (v.dia !== undefined && v.dia >= 110))
    flags.push("BP crisis range");
  return flags;
}

type DraftError = Partial<Record<"name" | "age" | "hr" | "sys" | "dia" | "spo2" | "temp", string>>;

/** Validates the intake form; returns field errors or a ready Patient. */
export function validateIntake(d: IntakeDraft): { errors: DraftError; patient: Patient | null } {
  const errors: DraftError = {};

  if (d.name.trim().length < 2) errors.name = "Full name required";
  const age = Number(d.age);
  if (d.age.trim() === "" || !Number.isFinite(age) || age < 0 || age > 120)
    errors.age = "Age 0–120";

  const num = (s: string, min: number, max: number, key: keyof DraftError, label: string) => {
    if (s.trim() === "") return undefined;
    const n = Number(s);
    if (!Number.isFinite(n) || n < min || n > max) {
      errors[key] = `${label} ${min}–${max}`;
      return undefined;
    }
    return n;
  };

  const hr = num(d.hr, 20, 250, "hr", "HR");
  const sys = num(d.sys, 40, 300, "sys", "Sys");
  const dia = num(d.dia, 20, 200, "dia", "Dia");
  const spo2 = num(d.spo2, 50, 100, "spo2", "SpO₂");
  const temp = num(d.temp, 25, 45, "temp", "Temp");

  if (Object.keys(errors).length > 0) return { errors, patient: null };

  const vitals: Vitals = { hr, sys, dia, spo2, temp };
  return {
    errors,
    patient: {
      id: genMRN(),
      name: d.name.trim(),
      age,
      sex: d.sex,
      complaint: d.complaint.trim() || "—",
      allergies: d.allergies.trim() || "NKDA",
      triage: d.triage,
      vitals,
      flags: computeVitalsFlags(vitals),
      status: "admitted",
      admittedAt: new Date().toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  };
}

/** Serializes the admission log as CSV (RFC-4180 escaping). */
export function toCSV(rows: Patient[]): string {
  const esc = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;
  const header = [
    "MRN", "Name", "Age", "Sex", "Triage", "Chief complaint", "Allergies",
    "HR", "BP sys", "BP dia", "SpO2", "Temp C", "Flags", "Status", "Admitted",
  ];
  const lines = rows.map((p) =>
    [
      p.id, p.name, p.age, p.sex, `${p.triage} ${TRIAGE_META[p.triage].label}`, p.complaint, p.allergies,
      p.vitals.hr ?? "", p.vitals.sys ?? "", p.vitals.dia ?? "", p.vitals.spo2 ?? "", p.vitals.temp ?? "",
      p.flags.join("; "), p.status, p.admittedAt,
    ]
      .map(esc)
      .join(",")
  );
  return [header.map(esc).join(","), ...lines].join("\n");
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface Props {
  patients: Patient[];
  activeId: string | null;
  onAdmit: (p: Patient) => void;
  onActivate: (id: string | null) => void;
  onDischarge: (id: string) => void;
  onRemove: (id: string) => void;
}

export function PatientRegistry({ patients, activeId, onAdmit, onActivate, onDischarge, onRemove }: Props) {
  const [draft, setDraft] = useState<IntakeDraft>(EMPTY);
  const [errors, setErrors] = useState<DraftError>({});

  const set = <K extends keyof IntakeDraft>(k: K, v: IntakeDraft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const { errors: errs, patient } = validateIntake(draft);
    setErrors(errs);
    if (patient) {
      onAdmit(patient);
      setDraft(EMPTY);
    }
  };

  const exportCSV = () => {
    const blob = new Blob([toCSV(patients)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "medlens-admissions.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const admitted = patients.filter((p) => p.status === "admitted").length;

  const inputCls = (err?: string) =>
    `w-full border-2 bg-paper px-3 py-2 text-sm outline-none transition-colors placeholder:text-inksoft/40 focus:border-teal ${
      err ? "border-alert" : "border-ink/25"
    }`;

  const vitalInput = (
    key: "hr" | "sys" | "dia" | "spo2" | "temp",
    label: string,
    unit: string,
    placeholder: string,
    wide = false
  ) => (
    <label className={`dark-grid block border border-pine px-2.5 py-2 ${wide ? "" : ""}`}>
      <span className="flex items-center justify-between font-mono text-[8px] font-bold tracking-[0.2em] text-mint/70">
        {label}
        {errors[key] && <span className="text-alert">{errors[key]}</span>}
      </span>
      <span className="mt-1 flex items-baseline gap-1">
        <input
          value={draft[key]}
          onChange={(e) => set(key, e.target.value)}
          inputMode="decimal"
          placeholder={placeholder}
          aria-label={`${label} vital sign`}
          className="w-full bg-transparent font-mono text-base font-bold text-mint outline-none placeholder:text-mint/25"
        />
        <span className="font-mono text-[9px] text-mint/50">{unit}</span>
      </span>
    </label>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      {/* -------- intake form -------- */}
      <form
        onSubmit={submit}
        className="border-2 border-ink bg-paper p-5 shadow-[8px_8px_0_0_rgba(11,47,45,0.85)] sm:p-6"
      >
        <div className="mb-4 flex items-center justify-between gap-3 border-b-2 border-dashed border-ink/20 pb-3">
          <p className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-[0.22em] text-inksoft">
            <Icon name="user" className="h-4 w-4 text-teal" /> ADMISSION FORM · REG-01
          </p>
          <span className="blink-soft font-mono text-[9px] tracking-widest text-alert">● REC</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_96px]">
          <div>
            <label htmlFor="pt-name" className="mb-1 block font-mono text-[9px] font-bold tracking-[0.2em] text-inksoft uppercase">
              Patient name *
            </label>
            <input
              id="pt-name"
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Ada Lovelace"
              className={inputCls(errors.name)}
            />
            {errors.name && <p className="mt-1 font-mono text-[10px] font-semibold text-alert">{errors.name}</p>}
          </div>
          <div>
            <label htmlFor="pt-age" className="mb-1 block font-mono text-[9px] font-bold tracking-[0.2em] text-inksoft uppercase">
              Age *
            </label>
            <input
              id="pt-age"
              value={draft.age}
              onChange={(e) => set("age", e.target.value)}
              inputMode="numeric"
              placeholder="34"
              className={inputCls(errors.age)}
            />
            {errors.age && <p className="mt-1 font-mono text-[10px] font-semibold text-alert">{errors.age}</p>}
          </div>
        </div>

        {/* sex + triage */}
        <div className="mt-3 grid gap-3 sm:grid-cols-[150px_1fr]">
          <div>
            <p className="mb-1 font-mono text-[9px] font-bold tracking-[0.2em] text-inksoft uppercase">Sex</p>
            <div className="flex border-2 border-ink/25">
              {(["F", "M", "X"] as const).map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => set("sex", s)}
                  aria-pressed={draft.sex === s}
                  className={`flex-1 py-2 font-mono text-xs font-bold transition-colors ${
                    draft.sex === s ? "bg-ink text-paper" : "bg-paper text-inksoft hover:bg-ink/5"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 flex items-center justify-between font-mono text-[9px] font-bold tracking-[0.2em] text-inksoft uppercase">
              <span>Triage · CTAS</span>
              <span className={`border px-2 py-0.5 text-[9px] tracking-widest ${TRIAGE_META[draft.triage].cls}`}>
                {draft.triage} · {TRIAGE_META[draft.triage].label}
              </span>
            </p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => set("triage", t)}
                  aria-pressed={draft.triage === t}
                  title={`${t} · ${TRIAGE_META[t].label}`}
                  className={`h-9 flex-1 border-2 font-display text-sm font-black transition-all duration-150 ${
                    draft.triage === t
                      ? `${TRIAGE_META[t].cls} -translate-y-0.5 shadow-[3px_3px_0_0_rgba(11,47,45,0.8)]`
                      : "border-ink/20 bg-paper text-inksoft/60 hover:border-ink/50 hover:-translate-y-0.5"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* complaint + allergies */}
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="pt-cc" className="mb-1 block font-mono text-[9px] font-bold tracking-[0.2em] text-inksoft uppercase">
              Chief complaint
            </label>
            <input
              id="pt-cc"
              value={draft.complaint}
              onChange={(e) => set("complaint", e.target.value)}
              placeholder="e.g. fever & dry cough, 3 days"
              className={inputCls()}
            />
          </div>
          <div>
            <label htmlFor="pt-all" className="mb-1 block font-mono text-[9px] font-bold tracking-[0.2em] text-inksoft uppercase">
              Known allergies
            </label>
            <input
              id="pt-all"
              value={draft.allergies}
              onChange={(e) => set("allergies", e.target.value)}
              placeholder="NKDA"
              className={inputCls()}
            />
          </div>
        </div>

        {/* vitals — monitor strip */}
        <p className="mb-1.5 mt-4 font-mono text-[9px] font-bold tracking-[0.2em] text-inksoft uppercase">
          Vitals at intake <span className="text-inksoft/60">· optional, drives the flag engine</span>
        </p>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
          {vitalInput("hr", "HR", "bpm", "82")}
          {vitalInput("sys", "SYS", "mmHg", "120")}
          {vitalInput("dia", "DIA", "mmHg", "80")}
          {vitalInput("spo2", "SpO₂", "%", "98")}
          {vitalInput("temp", "TEMP", "°C", "37.0")}
        </div>

        <button
          type="submit"
          className="group mt-5 inline-flex w-full items-center justify-center gap-2 bg-teal px-5 py-3 font-display text-sm font-extrabold uppercase tracking-wider text-paper shadow-[5px_5px_0_0_rgba(11,47,45,1)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-pine hover:shadow-[7px_7px_0_0_rgba(11,47,45,1)] active:translate-y-0"
        >
          <Icon name="user" className="h-4 w-4 transition-transform group-hover:scale-110" />
          Admit & open chart
        </button>
      </form>

      {/* -------- admission log -------- */}
      <div className="border-2 border-ink bg-paper shadow-[8px_8px_0_0_rgba(11,47,45,0.85)]">
        <div className="flex flex-wrap items-center gap-2 border-b-2 border-ink bg-pine px-4 py-3 text-paper">
          <p className="font-mono text-[10px] font-bold tracking-[0.22em] text-mint">ADMISSION LOG</p>
          <span className="font-mono text-[9px] tracking-widest text-paper/50">
            IN {admitted} · D/C {patients.length - admitted} · TOTAL {patients.length}
          </span>
          <button
            type="button"
            onClick={exportCSV}
            disabled={patients.length === 0}
            className="group ml-auto inline-flex items-center gap-1.5 border border-mint/40 bg-mint/10 px-2.5 py-1 font-mono text-[9px] font-bold tracking-[0.18em] text-mint transition-all duration-200 hover:-translate-y-px hover:bg-mint hover:text-pine disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Icon name="report" className="h-3 w-3" /> EXPORT CSV
          </button>
        </div>

        {patients.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Icon name="user" className="mx-auto h-8 w-8 text-ink/25" />
            <p className="mt-3 font-mono text-xs leading-relaxed text-inksoft/60">
              no patients on file —
              <span className="block">admit your first one from the form</span>
            </p>
          </div>
        ) : (
          <ul className="log-scroll max-h-[420px] divide-y divide-ink/10 overflow-y-auto">
            {patients.map((p) => {
              const isActive = p.id === activeId;
              const out = p.status === "discharged";
              const hasVitals = Object.values(p.vitals).some((v) => v !== undefined);
              return (
                <li
                  key={p.id}
                  className={`row-flash relative px-4 py-3 transition-colors ${
                    isActive ? "bg-teal/10" : out ? "opacity-55" : "hover:bg-paperdeep/50"
                  }`}
                >
                  {isActive && <span className="absolute inset-y-0 left-0 w-1 bg-teal" />}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-display text-sm font-extrabold">{p.name}</span>
                        <span className="font-mono text-[10px] tracking-wider text-inksoft">{p.id}</span>
                        <span
                          className={`border px-1.5 py-0.5 font-mono text-[8px] font-bold tracking-widest ${TRIAGE_META[p.triage].cls}`}
                        >
                          T{p.triage} {TRIAGE_META[p.triage].label}
                        </span>
                        {isActive && (
                          <span className="inline-flex items-center gap-1 font-mono text-[8px] font-bold tracking-widest text-teal">
                            <span className="dot-live h-1.5 w-1.5 rounded-full bg-teal" /> ON CHART
                          </span>
                        )}
                        {out && (
                          <span className="font-mono text-[8px] font-bold tracking-widest text-inksoft/60">DISCHARGED</span>
                        )}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-inksoft">
                        CC: <span className="text-ink">{p.complaint}</span> · Allergies: {p.allergies}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[9px] text-inksoft/80">
                        <span>
                          {p.age}y {p.sex} · adm {p.admittedAt}
                        </span>
                        {hasVitals && (
                          <span className="text-teal">
                            {[
                              p.vitals.hr !== undefined ? `♥ ${p.vitals.hr}` : "",
                              p.vitals.sys !== undefined && p.vitals.dia !== undefined
                                ? `BP ${p.vitals.sys}/${p.vitals.dia}`
                                : "",
                              p.vitals.spo2 !== undefined ? `SpO₂ ${p.vitals.spo2}%` : "",
                              p.vitals.temp !== undefined ? `${p.vitals.temp}°C` : "",
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        )}
                        {p.flags.map((f) => (
                          <span key={f} className="border border-alert/50 bg-alert/10 px-1 py-px font-bold tracking-widest text-alert">
                            ⚠ {f.toUpperCase()}
                          </span>
                        ))}
                      </p>
                    </div>

                    <div className="flex shrink-0 gap-1">
                      {!out && (
                        <button
                          onClick={() => onActivate(isActive ? null : p.id)}
                          title={isActive ? "Release chart" : "Set as active chart"}
                          className={`border px-2 py-1 font-mono text-[9px] font-bold tracking-widest transition-all duration-150 hover:-translate-y-px ${
                            isActive
                              ? "border-teal bg-teal text-paper"
                              : "border-ink/25 text-inksoft hover:border-teal hover:text-teal"
                          }`}
                        >
                          {isActive ? "RELEASE" : "CHART"}
                        </button>
                      )}
                      {!out && (
                        <button
                          onClick={() => onDischarge(p.id)}
                          title="Discharge patient"
                          className="border border-ink/25 px-2 py-1 font-mono text-[9px] font-bold tracking-widest text-inksoft transition-all duration-150 hover:-translate-y-px hover:border-amber hover:text-amber"
                        >
                          D/C
                        </button>
                      )}
                      <button
                        onClick={() => onRemove(p.id)}
                        title="Remove record"
                        aria-label={`Remove ${p.name}`}
                        className="grid h-6 w-6 place-items-center border border-ink/25 text-inksoft transition-all duration-150 hover:-translate-y-px hover:border-alert hover:text-alert"
                      >
                        <Icon name="x" className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <p className="border-t border-dashed border-ink/20 px-4 py-2.5 font-mono text-[9px] leading-relaxed tracking-wider text-inksoft/70">
          <Icon name="warn" className="mr-1 inline h-3 w-3 text-amber" />
          ON-DEVICE ONLY — records persist in this browser and never leave it.
        </p>
      </div>
    </div>
  );
}
