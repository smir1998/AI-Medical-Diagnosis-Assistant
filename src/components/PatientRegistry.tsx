import { useState } from "react";

export interface Patient {
  id: string;
  name: string;
  age: number;
  sex: "F" | "M" | "X";
  complaint: string;
  allergies: string;
  triage: 1 | 2 | 3 | 4 | 5;
  vitals: {
    hr?: number;
    sys?: number;
    dia?: number;
    spo2?: number;
    temp?: number;
  };
  flags: string[];
  status: "admitted" | "discharged";
  admittedAt: string;
}

export const TRIAGE_META: Record<number, { label: string; cls: string }> = {
  1: { label: "RESUS", cls: "bg-alert text-paper border-alert" },
  2: { label: "EMERGENT", cls: "bg-alertdeep text-paper border-alertdeep" },
  3: { label: "URGENT", cls: "bg-amber text-paper border-amber" },
  4: { label: "LESS URGENT", cls: "bg-teal text-paper border-teal" },
  5: { label: "MINOR", cls: "bg-ink/10 text-ink border-ink/30" },
};

interface Props {
  patients: Patient[];
  activeId: string | null;
  onAdmit: (p: Patient) => void;
  onActivate: (id: string | null) => void;
  onDischarge: (id: string) => void;
  onRemove: (id: string) => void;
}

export function PatientRegistry({ patients, activeId, onAdmit, onActivate, onDischarge, onRemove }: Props) {
  const [draft, setDraft] = useState({
    name: "",
    age: "",
    sex: "F" as Patient["sex"],
    complaint: "",
    allergies: "NKDA",
    triage: 3 as Patient["triage"],
    hr: "",
    sys: "",
    dia: "",
    spo2: "",
    temp: "",
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim() || !draft.age) return;

    const vitals: Patient["vitals"] = {};
    if (draft.hr) vitals.hr = Number(draft.hr);
    if (draft.sys) vitals.sys = Number(draft.sys);
    if (draft.dia) vitals.dia = Number(draft.dia);
    if (draft.spo2) vitals.spo2 = Number(draft.spo2);
    if (draft.temp) vitals.temp = Number(draft.temp);

    const flags: string[] = [];
    if (vitals.spo2 !== undefined && vitals.spo2 < 94) flags.push("Hypoxia");
    if (vitals.hr !== undefined && vitals.hr > 120) flags.push("Tachycardia");
    if (vitals.temp !== undefined && vitals.temp >= 38) flags.push("Febrile");

    const patient: Patient = {
      id: `MRN-${Date.now().toString(36).toUpperCase().slice(-5)}`,
      name: draft.name.trim(),
      age: Number(draft.age),
      sex: draft.sex,
      complaint: draft.complaint.trim() || "—",
      allergies: draft.allergies.trim() || "NKDA",
      triage: draft.triage,
      vitals,
      flags,
      status: "admitted",
      admittedAt: new Date().toLocaleString("en-GB"),
    };

    onAdmit(patient);
    setDraft({
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
    });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
      <form onSubmit={submit} className="border-2 border-ink bg-paper p-5 shadow-[8px_8px_0_0_rgba(11,47,45,0.85)]">
        <p className="mb-4 flex items-center gap-2 border-b-2 border-dashed border-ink/20 pb-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-teal">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
          </svg>
          <span className="font-mono text-[10px] font-bold tracking-[0.22em] text-inksoft">ADMISSION FORM · REG-01</span>
        </p>

        <div className="grid gap-3 sm:grid-cols-[1fr_96px]">
          <div>
            <label className="mb-1 block font-mono text-[9px] font-bold tracking-[0.2em] text-inksoft uppercase">Patient name *</label>
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="e.g. Ada Lovelace"
              className="w-full border-2 border-ink/25 bg-paper px-3 py-2 text-sm outline-none focus:border-teal"
            />
          </div>
          <div>
            <label className="mb-1 block font-mono text-[9px] font-bold tracking-[0.2em] text-inksoft uppercase">Age *</label>
            <input
              type="number"
              value={draft.age}
              onChange={(e) => setDraft({ ...draft, age: e.target.value })}
              placeholder="34"
              className="w-full border-2 border-ink/25 bg-paper px-3 py-2 text-sm outline-none focus:border-teal"
            />
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block font-mono text-[9px] font-bold tracking-[0.2em] text-inksoft uppercase">Chief complaint</label>
            <input
              value={draft.complaint}
              onChange={(e) => setDraft({ ...draft, complaint: e.target.value })}
              placeholder="e.g. fever & dry cough, 3 days"
              className="w-full border-2 border-ink/25 bg-paper px-3 py-2 text-sm outline-none focus:border-teal"
            />
          </div>
          <div>
            <label className="mb-1 block font-mono text-[9px] font-bold tracking-[0.2em] text-inksoft uppercase">Known allergies</label>
            <input
              value={draft.allergies}
              onChange={(e) => setDraft({ ...draft, allergies: e.target.value })}
              placeholder="NKDA"
              className="w-full border-2 border-ink/25 bg-paper px-3 py-2 text-sm outline-none focus:border-teal"
            />
          </div>
        </div>

        <button
          type="submit"
          className="group mt-5 inline-flex w-full items-center justify-center gap-2 bg-teal px-5 py-3 font-display text-sm font-extrabold uppercase tracking-wider text-paper shadow-[5px_5px_0_0_rgba(11,47,45,1)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-pine"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
          </svg>
          Admit & open chart
        </button>
      </form>

      <div className="border-2 border-ink bg-paper shadow-[8px_8px_0_0_rgba(11,47,45,0.85)]">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b-2 border-ink bg-pine px-5 py-3 text-paper">
          <p className="font-mono text-[10px] font-bold tracking-[0.22em] text-mint">ADMISSION LOG</p>
          <span className="font-mono text-[9px] tracking-widest text-paper/50">
            IN {patients.filter((p) => p.status === "admitted").length} · D/C {patients.filter((p) => p.status === "discharged").length} · TOTAL {patients.length}
          </span>
        </div>

        {patients.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto h-8 w-8 text-ink/25">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
            </svg>
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
              return (
                <li key={p.id} className={`row-flash relative px-4 py-3 transition-colors ${isActive ? "bg-teal/10" : out ? "opacity-55" : "hover:bg-paperdeep/50"}`}>
                  {isActive && <span className="absolute inset-y-0 left-0 w-1 bg-teal" />}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-display text-sm font-extrabold">{p.name}</span>
                        <span className="font-mono text-[10px] tracking-wider text-inksoft">{p.id}</span>
                        <span className={`border px-1.5 py-0.5 font-mono text-[8px] font-bold tracking-widest ${TRIAGE_META[p.triage].cls}`}>
                          T{p.triage} {TRIAGE_META[p.triage].label}
                        </span>
                        {isActive && (
                          <span className="inline-flex items-center gap-1 font-mono text-[8px] font-bold tracking-widest text-teal">
                            <span className="dot-live h-1.5 w-1.5 rounded-full bg-teal" /> ON CHART
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-inksoft">
                        CC: <span className="text-ink">{p.complaint}</span> · Allergies: {p.allergies}
                      </p>
                    </div>

                    <div className="flex shrink-0 gap-1">
                      {!out && (
                        <button
                          onClick={() => onActivate(isActive ? null : p.id)}
                          className={`border px-2 py-1 font-mono text-[9px] font-bold tracking-widest transition-all duration-150 hover:-translate-y-px ${
                            isActive ? "border-teal bg-teal text-paper" : "border-ink/25 text-inksoft hover:border-teal hover:text-teal"
                          }`}
                        >
                          {isActive ? "RELEASE" : "CHART"}
                        </button>
                      )}
                      {!out && (
                        <button
                          onClick={() => onDischarge(p.id)}
                          className="border border-ink/25 px-2 py-1 font-mono text-[9px] font-bold tracking-widest text-inksoft transition-all duration-150 hover:-translate-y-px hover:border-amber hover:text-amber"
                        >
                          D/C
                        </button>
                      )}
                      <button
                        onClick={() => onRemove(p.id)}
                        className="grid h-6 w-6 place-items-center border border-ink/25 text-inksoft transition-all duration-150 hover:-translate-y-px hover:border-alert hover:text-alert"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3">
                          <path d="M5 5l14 14M19 5L5 19" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
