import { useState, type FormEvent } from "react";
import { CountUp, Icon } from "./ui";

export interface Patient {
  id: string; // auto-issued MRN
  name: string;
  age: number;
  sex: "F" | "M" | "X";
  complaint: string;
  allergies: string;
  triage: 1 | 2 | 3 | 4 | 5;
  admittedAt: string; // HH:MM
  date: string; // DD Mon
  status: "admitted" | "discharged";
}

export const TRIAGE_META: Record<Patient["triage"], { label: string; chip: string }> = {
  1: { label: "RESUS", chip: "bg-alert text-paper border-alert" },
  2: { label: "EMERG", chip: "bg-amber text-paper border-amber" },
  3: { label: "URGENT", chip: "bg-teal text-paper border-teal" },
  4: { label: "STANDARD", chip: "bg-ink/75 text-paper border-ink/75" },
  5: { label: "MINOR", chip: "bg-paper text-inksoft border-ink/35" },
};

function makeMrn(seedText: string): string {
  const t = (Date.now() + seedText.length * 7919).toString(36).toUpperCase();
  return `MRN-${t.slice(-5)}`;
}

interface Props {
  patients: Patient[];
  activeId: string | null;
  onAdmit: (p: Patient) => void;
  onActivate: (id: string) => void;
  onDischarge: (id: string) => void;
  onRemove: (id: string) => void;
}

const EMPTY = {
  name: "",
  age: "",
  sex: "F" as Patient["sex"],
  complaint: "",
  allergies: "",
  triage: 3 as Patient["triage"],
};

const LBL = "font-mono text-[9px] font-semibold uppercase tracking-[0.22em] text-inksoft";
const FIELD =
  "mt-1.5 w-full border-2 bg-paper px-3 py-2 text-sm outline-none transition-colors placeholder:text-inksoft/40 focus:border-teal";

export function PatientRegistry({ patients, activeId, onAdmit, onActivate, onDischarge, onRemove }: Props) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<{ name?: string; age?: string }>({});
  const [flashId, setFlashId] = useState<string | null>(null);

  const admitted = patients.filter((p) => p.status === "admitted").length;
  const discharged = patients.length - admitted;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    const ageNum = Number(form.age);
    if (form.name.trim().length < 2) errs.name = "full name required (min 2 chars)";
    if (form.age === "" || Number.isNaN(ageNum) || ageNum < 0 || ageNum > 120) errs.age = "age must be 0–120";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const now = new Date();
    const p: Patient = {
      id: makeMrn(form.name),
      name: form.name.trim(),
      age: ageNum,
      sex: form.sex,
      complaint: form.complaint.trim() || "—",
      allergies: form.allergies.trim() || "NKDA",
      triage: form.triage,
      admittedAt: now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      date: now.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
      status: "admitted",
    };
    onAdmit(p);
    setFlashId(p.id);
    setForm(EMPTY);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
      {/* ---------- admission form ---------- */}
      <form
        onSubmit={submit}
        className="border-2 border-ink bg-paper p-5 shadow-[8px_8px_0_0_rgba(11,47,45,0.85)] sm:p-6"
      >
        <p className="mb-5 flex items-center gap-2.5 border-b border-dashed border-ink/25 pb-3">
          <span className="grid h-9 w-9 place-items-center bg-pine text-paper">
            <Icon name="user" className="h-4.5 w-4.5" />
          </span>
          <span>
            <span className="block font-display text-sm font-extrabold uppercase tracking-wide">Admission form</span>
            <span className="block font-mono text-[9px] tracking-[0.24em] text-inksoft">
              REG-01 · ENTER PATIENT DETAILS
            </span>
          </span>
          <span className="ml-auto hidden font-mono text-[10px] text-inksoft sm:block">MRN auto-issued</span>
        </p>

        <div className="grid gap-4 sm:grid-cols-[1.4fr_0.6fr]">
          <label className="block">
            <span className={LBL}>Patient name *</span>
            <input
              className={`${FIELD} ${errors.name ? "border-alert" : "border-ink/25"}`}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Aisha Verma"
              autoComplete="off"
            />
            {errors.name && <span className="mt-1 block font-mono text-[10px] text-alert">⚠ {errors.name}</span>}
          </label>
          <label className="block">
            <span className={LBL}>Age *</span>
            <input
              type="number"
              min={0}
              max={120}
              className={`${FIELD} tabular-nums ${errors.age ? "border-alert" : "border-ink/25"}`}
              value={form.age}
              onChange={(e) => setForm({ ...form, age: e.target.value })}
              placeholder="34"
            />
            {errors.age && <span className="mt-1 block font-mono text-[10px] text-alert">⚠ {errors.age}</span>}
          </label>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <span className={LBL}>Sex</span>
            <div className="mt-1.5 grid grid-cols-3 gap-1">
              {(["F", "M", "X"] as const).map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setForm({ ...form, sex: s })}
                  aria-pressed={form.sex === s}
                  className={`border px-2 py-2 font-mono text-xs font-bold transition-all duration-200 ${
                    form.sex === s
                      ? "border-ink bg-ink text-paper shadow-[3px_3px_0_0_rgba(14,124,114,0.8)]"
                      : "border-ink/25 bg-paper text-inksoft hover:border-ink hover:text-ink"
                  }`}
                >
                  {s === "F" ? "Female" : s === "M" ? "Male" : "X / —"}
                </button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className={LBL}>Known allergies</span>
            <input
              className={`${FIELD} border-ink/25`}
              value={form.allergies}
              onChange={(e) => setForm({ ...form, allergies: e.target.value })}
              placeholder="NKDA — none known"
              autoComplete="off"
            />
          </label>
        </div>

        <label className="mt-4 block">
          <span className={LBL}>Chief complaint</span>
          <input
            className={`${FIELD} border-ink/25`}
            value={form.complaint}
            onChange={(e) => setForm({ ...form, complaint: e.target.value })}
            placeholder="e.g. productive cough × 4 days"
            autoComplete="off"
          />
        </label>

        <div className="mt-4">
          <span className={LBL}>Triage acuity · CTAS</span>
          <div className="mt-1.5 grid grid-cols-5 gap-1">
            {([1, 2, 3, 4, 5] as const).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setForm({ ...form, triage: t })}
                aria-pressed={form.triage === t}
                className={`border px-1 py-2 text-center transition-all duration-200 ${
                  form.triage === t
                    ? `${TRIAGE_META[t].chip} -translate-y-px shadow-[3px_3px_0_0_rgba(11,47,45,0.7)]`
                    : "border-ink/20 bg-paper text-inksoft hover:border-ink/50 hover:-translate-y-px"
                }`}
              >
                <span className="block font-display text-base font-black leading-none">{t}</span>
                <span className="mt-0.5 block font-mono text-[8px] tracking-wider">{TRIAGE_META[t].label}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="group mt-5 inline-flex w-full items-center justify-center gap-2 bg-pine px-5 py-3 font-display text-sm font-extrabold uppercase tracking-wider text-paper shadow-[5px_5px_0_0_rgba(11,47,45,0.9)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal hover:shadow-[7px_7px_0_0_rgba(11,47,45,0.9)] active:translate-y-0 active:shadow-[3px_3px_0_0_rgba(11,47,45,0.9)]"
        >
          <Icon name="user" className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
          Admit & chart patient
        </button>
      </form>

      {/* ---------- admission log ---------- */}
      <div className="flex min-h-full flex-col border-2 border-ink bg-paper shadow-[8px_8px_0_0_rgba(11,47,45,0.85)]">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b-2 border-ink bg-paperdeep/70 px-5 py-3">
          <p className="flex items-center gap-2 font-display text-sm font-extrabold uppercase tracking-wide">
            <Icon name="clock" className="h-4 w-4 text-teal" /> Admission log
          </p>
          <div className="ml-auto flex items-center gap-4 font-mono text-[10px] tracking-widest text-inksoft">
            <span>
              IN <CountUp value={admitted} className="font-bold text-teal" />
            </span>
            <span>
              D/C <CountUp value={discharged} className="font-bold text-ink" />
            </span>
            <span>
              TOTAL <CountUp value={patients.length} className="font-bold text-ink" />
            </span>
          </div>
        </div>

        {patients.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2.5 px-6 py-14 text-center">
            <Icon name="user" className="h-9 w-9 text-ink/20" />
            <p className="font-mono text-xs leading-relaxed text-inksoft/60">
              no admissions on file —
              <span className="block">register the first patient to stamp the analysis reports</span>
            </p>
          </div>
        ) : (
          <div className="log-scroll max-h-[380px] flex-1 overflow-y-auto">
            <table className="w-full min-w-[580px] text-left">
              <thead className="sticky top-0 z-10 bg-paper">
                <tr className="border-b-2 border-ink font-mono text-[9px] tracking-[0.18em] text-inksoft">
                  <th className="px-4 py-2 font-semibold">MRN</th>
                  <th className="px-2 py-2 font-semibold">PATIENT</th>
                  <th className="px-2 py-2 font-semibold">AGE/SEX</th>
                  <th className="px-2 py-2 font-semibold">TRIAGE</th>
                  <th className="px-2 py-2 font-semibold">ADMITTED</th>
                  <th className="px-2 py-2 pr-4 text-right font-semibold">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => {
                  const meta = TRIAGE_META[p.triage];
                  const isActive = p.id === activeId;
                  const dced = p.status === "discharged";
                  return (
                    <tr
                      key={p.id}
                      className={`border-b border-dashed border-ink/15 font-mono text-[11px] transition-all duration-200 hover:bg-teal/5 ${
                        isActive ? "border-l-2 border-l-teal bg-teal/8" : ""
                      } ${dced ? "opacity-50" : ""} ${flashId === p.id ? "row-flash" : ""}`}
                    >
                      <td className="px-4 py-2.5 font-semibold text-teal">{p.id}</td>
                      <td className="px-2 py-2.5">
                        <span className="font-sans text-xs font-bold text-ink">{p.name}</span>
                        <span className="block text-[9px] text-inksoft">
                          CC: {p.complaint} · {p.allergies}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 tabular-nums">
                        {p.age}y {p.sex}
                      </td>
                      <td className="px-2 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1 border px-1.5 py-0.5 text-[9px] font-bold tracking-widest ${meta.chip}`}
                        >
                          {p.triage} {meta.label}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 tabular-nums text-inksoft">
                        {p.date} {p.admittedAt}
                      </td>
                      <td className="px-2 py-2.5 pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {dced ? (
                            <span className="text-[9px] tracking-widest text-inksoft">DISCHARGED</span>
                          ) : isActive ? (
                            <span className="inline-flex items-center gap-1.5 text-[9px] font-bold tracking-widest text-teal">
                              <span className="dot-live h-1.5 w-1.5 rounded-full bg-teal" />
                              ON CHART
                            </span>
                          ) : (
                            <button
                              onClick={() => onActivate(p.id)}
                              className="border border-teal/50 px-2 py-1 text-[9px] font-bold tracking-widest text-teal transition-all duration-200 hover:-translate-y-px hover:bg-teal hover:text-paper"
                            >
                              CHART
                            </button>
                          )}
                          {!dced && (
                            <button
                              onClick={() => onDischarge(p.id)}
                              title="Discharge patient"
                              className="border border-amber/60 px-2 py-1 text-[9px] font-bold tracking-widest text-amber transition-all duration-200 hover:-translate-y-px hover:bg-amber hover:text-paper"
                            >
                              D/C
                            </button>
                          )}
                          <button
                            onClick={() => onRemove(p.id)}
                            aria-label={`Remove ${p.name} from the log`}
                            className="grid h-6 w-6 place-items-center border border-ink/20 text-inksoft transition-all duration-200 hover:border-alert hover:text-alert"
                          >
                            <Icon name="x" className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="border-t border-dashed border-ink/20 px-5 py-2.5 font-mono text-[9px] tracking-wider text-inksoft/70">
          STORED ON-DEVICE ONLY · NEWEST FIRST ·{" "}
          {patients.length ? `LAST MRN ${patients[0].id}` : "AWAITING FIRST ADMISSION"}
        </p>
      </div>
    </div>
  );
}
