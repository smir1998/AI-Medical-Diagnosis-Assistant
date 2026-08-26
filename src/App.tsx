import { useEffect, useState } from "react";
import { TICKER_ITEMS } from "./data/medical";
import type { ImageResult, SymptomResult } from "./lib/engine";
import { nowTime } from "./lib/engine";
import { TEST_CASES } from "./lib/tests";
import { StatusBar } from "./components/StatusBar";
import { SymptomChecker } from "./components/SymptomChecker";
import { ImageAnalysis } from "./components/ImageAnalysis";
import { DermScan, type DermResult } from "./components/DermScan";
import { Chatbot } from "./components/Chatbot";
import { PatientRegistry, type Patient } from "./components/PatientRegistry";
import { ReportPanel } from "./components/ReportPanel";
import { HistoryPanel, ModelVitals, PipelinePanel, type HistoryEntry } from "./components/RailPanels";
import { Evaluation, FieldNotes, InsideModel } from "./components/InfoSections";
import { QABench } from "./components/QABench";
import { CountUp, ECGLine, Icon, Reveal, Scramble, SectionTag, type IconName } from "./components/ui";

type Tab = "symptoms" | "image" | "derm" | "chat";

const TABS: { id: Tab; label: string; icon: IconName; hint: string }[] = [
  { id: "symptoms", label: "Symptom Lab", icon: "stetho", hint: "NLP-encoded differential" },
  { id: "image", label: "Radiology Lab", icon: "scan", hint: "CNN · chest X-ray" },
  { id: "derm", label: "Derm Scan", icon: "scope", hint: "CNN · skin lesions" },
  { id: "chat", label: "NLP Desk", icon: "chat", hint: "medical Q&A" },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("symptoms");
  const [pipeline, setPipeline] = useState({ stage: -1, running: false });
  const [symptomResult, setSymptomResult] = useState<SymptomResult | null>(null);
  const [imageResult, setImageResult] = useState<ImageResult | null>(null);
  const [dermResult, setDermResult] = useState<DermResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      const raw = localStorage.getItem("medlens-history");
      const parsed = raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
      return Array.isArray(parsed) ? parsed.slice(0, 12) : [];
    } catch {
      return [];
    }
  });
  const [qaOpen, setQaOpen] = useState(false);

  /* ---------- patient registry (persisted) ---------- */
  const [patients, setPatients] = useState<Patient[]>(() => {
    try {
      const raw = localStorage.getItem("medlens-patients");
      const parsed = raw ? (JSON.parse(raw) as Patient[]) : [];
      return Array.isArray(parsed) ? parsed.slice(0, 30) : [];
    } catch {
      return [];
    }
  });
  const [activePatientId, setActivePatientId] = useState<string | null>(() => {
    try {
      return localStorage.getItem("medlens-active-patient");
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("medlens-history", JSON.stringify(history.slice(0, 12)));
    } catch {
      /* storage unavailable — session-only log */
    }
  }, [history]);

  useEffect(() => {
    try {
      localStorage.setItem("medlens-patients", JSON.stringify(patients.slice(0, 30)));
    } catch {
      /* private mode — registry lives for the session only */
    }
  }, [patients]);

  useEffect(() => {
    try {
      if (activePatientId) localStorage.setItem("medlens-active-patient", activePatientId);
      else localStorage.removeItem("medlens-active-patient");
    } catch {
      /* ignore */
    }
  }, [activePatientId]);

  const activePatient = patients.find((p) => p.id === activePatientId && p.status === "admitted") ?? null;

  const onAdmit = (p: Patient) => {
    setPatients((prev) => [p, ...prev].slice(0, 30));
    setActivePatientId(p.id);
    setHistory((h) => [
      {
        id: Date.now(),
        time: nowTime(),
        type: "adm" as const,
        title: `${p.name} · T${p.triage} admitted`,
        confidence: -1,
      },
      ...h,
    ]);
  };

  const dischargePatient = (id: string) => {
    setPatients((prev) => prev.map((p) => (p.id === id ? { ...p, status: "discharged" as const } : p)));
    setActivePatientId((cur) => (cur === id ? null : cur));
  };

  const removePatient = (id: string) => {
    setPatients((prev) => prev.filter((p) => p.id !== id));
    setActivePatientId((cur) => (cur === id ? null : cur));
  };

  const onPipeline = (stage: number, running: boolean) => setPipeline({ stage, running });

  const onSymptomDone = (r: SymptomResult) => {
    setSymptomResult(r);
    setHistory((h) => [
      {
        id: Date.now(),
        time: nowTime(),
        type: "symptom" as const,
        title: r.scored[0]?.disease.name ?? "—",
        confidence: r.scored[0]?.confidence ?? 0,
      },
      ...h,
    ]);
  };

  const onImageDone = (r: ImageResult) => {
    setImageResult(r);
    setHistory((h) => [
      {
        id: Date.now(),
        time: nowTime(),
        type: "image" as const,
        title: r.fileName || "Chest X-ray",
        confidence: Math.max(r.pneumonia, r.normal),
      },
      ...h,
    ]);
  };

  const onDermDone = (r: DermResult) => {
    setDermResult(r);
    setHistory((h) => [
      {
        id: Date.now(),
        time: nowTime(),
        type: "derm" as const,
        title: r.fileName,
        confidence: Math.max(r.benign, r.atypical, r.melanoma),
      },
      ...h,
    ]);
  };

  return (
    <div id="top" className="min-h-screen">
      <div className="noise-overlay" aria-hidden="true" />
      <StatusBar onQA={() => setQaOpen(true)} />
      {qaOpen && <QABench onClose={() => setQaOpen(false)} />}

      {/* ---------- triage board ---------- */}
      <section className="border-b border-ink/15">
        <div className="mx-auto max-w-7xl px-4 pt-10 pb-8 sm:px-6 sm:pt-14">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <Reveal>
                <SectionTag tone="alert">Deep Learning in Health Care</SectionTag>
              </Reveal>
              <h1 className="mt-4 font-display text-[13vw] font-black leading-[0.88] tracking-tight sm:text-6xl lg:text-7xl">
                <Scramble text="DIAGNOSTIC" />
                <br />
                <span className="text-teal">
                  <Scramble text="CONSOLE" />
                </span>
                <span className="text-alert">_</span>
              </h1>
              <Reveal delay={150}>
                <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-inksoft">
                  An AI triage workstation that fuses four heads — a <strong className="text-ink">symptom encoder</strong>,
                  a <strong className="text-ink">chest-X-ray CNN</strong>, a <strong className="text-ink">dermoscopy CNN</strong> and a{" "}
                  <strong className="text-ink">medical NLP desk</strong> — into one decision-support report. Built to teach the
                  pipeline, not to replace your doctor.
                </p>
              </Reveal>
            </div>

            {/* live stats strip */}
            <Reveal delay={200}>
              <dl className="grid grid-cols-2 border-2 border-ink bg-paper shadow-[7px_7px_0_0_rgba(12,43,43,0.9)] sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                {[
                  { k: "Scans analyzed", v: 12480, d: 0 },
                  { k: "Symptom dims", v: 24, d: 0 },
                  { k: "Disease profiles", v: 12, d: 0 },
                  { k: "Top-model acc.", v: 94.2, d: 1, suffix: "%" },
                ].map((s) => (
                  <div key={s.k} className="-ml-px -mt-px border border-ink/15 px-5 py-4">
                    <dt className="font-mono text-[9px] tracking-[0.18em] text-inksoft uppercase">{s.k}</dt>
                    <dd className="mt-1 font-display text-2xl font-black tabular-nums text-ink">
                      <CountUp value={s.v} decimals={s.d} suffix={s.suffix ?? ""} />
                    </dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>
        </div>

        {/* live ticker */}
        <div className="overflow-hidden border-y border-pine bg-pine py-2 text-paper" aria-hidden="true">
          <div className="ticker-track flex w-max items-center gap-8 whitespace-nowrap font-mono text-[11px] tracking-wider">
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((t, i) => (
              <span key={i} className="flex items-center gap-8">
                <span className={i % 2 ? "text-mint" : "text-paper/70"}>{t}</span>
                <span className="text-alert">✚</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- console workspace ---------- */}
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        {/* 01 · registrar */}
        <section aria-label="Patient intake and admission log" className="mb-14">
          <Reveal>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
              <div>
                <SectionTag tone="ink">Step 01 · Registrar</SectionTag>
                <h2 className="mt-3 font-display text-3xl font-black tracking-tight sm:text-4xl">
                  Patient intake<span className="text-teal">, on the record.</span>
                </h2>
              </div>
              <p className="max-w-sm text-sm leading-relaxed text-inksoft">
                Admit a patient before running any lab — the active chart is stamped onto every analysis
                report. Entries are logged and persist in this browser only.
              </p>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <PatientRegistry
              patients={patients}
              activeId={activePatientId}
              onAdmit={onAdmit}
              onActivate={setActivePatientId}
              onDischarge={dischargePatient}
              onRemove={removePatient}
            />
          </Reveal>
        </section>

        {/* 02 · diagnostics */}
        <Reveal className="mb-4">
          <SectionTag>Step 02 · Diagnostics</SectionTag>
        </Reveal>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* left: tabbed labs */}
          <div className="min-w-0">
            <div className="flex flex-wrap gap-1" role="tablist" aria-label="Diagnostic labs">
              {TABS.map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    role="tab"
                    id={`tab-${t.id}`}
                    aria-selected={active}
                    aria-controls={`panel-${t.id}`}
                    onClick={() => setTab(t.id)}
                    className={`group relative -mb-px inline-flex items-center gap-2.5 border-2 px-4 py-3 text-left transition-all duration-200 ${
                      active
                        ? "border-ink border-b-paper bg-paper text-ink z-10"
                        : "border-ink/20 bg-paperdeep/60 text-inksoft hover:border-ink/50 hover:-translate-y-0.5"
                    }`}
                  >
                    <span className={`grid h-8 w-8 place-items-center ${active ? "bg-teal text-paper" : "bg-ink/10 text-inksoft group-hover:bg-ink/20"} transition-colors`}>
                      <Icon name={t.icon} className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block font-display text-[13px] font-extrabold uppercase tracking-wide leading-none">
                        {t.label}
                      </span>
                      <span className="mt-1 block font-mono text-[9px] tracking-widest text-inksoft/70">{t.hint}</span>
                    </span>
                    {active && <span className="absolute inset-x-3 top-0 h-1 bg-alert" />}
                  </button>
                );
              })}
            </div>

            <div
              role="tabpanel"
              id={`panel-${tab}`}
              aria-labelledby={`tab-${tab}`}
              className="border-2 border-ink bg-paper p-5 shadow-[9px_9px_0_0_rgba(11,47,45,0.85)] sm:p-7"
            >
              {tab === "symptoms" && <SymptomChecker onComplete={onSymptomDone} onPipeline={onPipeline} />}
              {tab === "image" && <ImageAnalysis onComplete={onImageDone} onPipeline={onPipeline} />}
              {tab === "derm" && <DermScan onDone={onDermDone} onPipeline={onPipeline} />}
              {tab === "chat" && <Chatbot />}
            </div>

            <div className="mt-8">
              <Reveal>
                <SectionTag tone="ink">Step 03 · Report</SectionTag>
              </Reveal>
              <div className="mt-3">
                <ReportPanel symptom={symptomResult} image={imageResult} derm={dermResult} patient={activePatient} />
              </div>
            </div>
          </div>

          {/* right rail */}
          <aside className="space-y-5 lg:sticky lg:top-32 lg:self-start">
            <PipelinePanel stage={pipeline.stage} running={pipeline.running} />
            <ModelVitals />
            <HistoryPanel entries={history} />
          </aside>
        </div>
      </main>

      <ECGLine className="block h-12 w-full text-teal/70" slow />

      <InsideModel />
      <Evaluation />
      <FieldNotes />

      {/* ---------- footer ---------- */}
      <footer className="dark-grid border-t-4 border-alert text-paper">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="grid gap-8 md:grid-cols-[1.2fr_1fr]">
            <div>
              <p className="flex items-center gap-2.5 font-display text-xl font-black tracking-tight">
                <span className="grid h-8 w-8 place-items-center bg-alert text-paper">
                  <Icon name="warn" className="h-4 w-4" />
                </span>
                Read this before anything else.
              </p>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-paper/70">
                MedLens is a <strong className="text-paper">learning tool and decision-support simulation</strong>, not a
                medical device. Its predictions come from a small hand-built knowledge base and a
                simulated CNN — they must never replace examination by a licensed clinician. If symptoms
                are severe, sudden, or worsening — chest pain, breathing difficulty, confusion — call your
                local emergency number now.
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] font-bold tracking-[0.24em] text-mint/70">STACK & LINEAGE</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {["CNN", "Transfer Learning", "Computer Vision", "NLP", "Softmax", "Grad-CAM", "React", "TypeScript", "Keras-style pipeline"].map(
                  (t) => (
                    <span key={t} className="border border-mint/25 px-2.5 py-1 font-mono text-[10px] tracking-wider text-mint/80 transition-colors hover:border-mint hover:text-mint">
                      {t}
                    </span>
                  )
                )}
              </div>
              <button
                onClick={() => setQaOpen(true)}
                className="group mt-5 inline-flex items-center gap-2 border border-mint/40 bg-mint/10 px-3.5 py-2 font-mono text-[10px] font-bold tracking-[0.2em] text-mint transition-all duration-200 hover:-translate-y-px hover:bg-mint hover:text-pine"
              >
                <Icon name="check" className="h-3 w-3" /> RUN QA BENCH · {TEST_CASES.length} CASES
              </button>
              <p className="mt-5 font-mono text-[10px] leading-relaxed tracking-wider text-paper/40">
                MEDLENS·AI — DEEP LEARNING IN HEALTH CARE
                <br />
                ALL INFERENCE RUNS LOCALLY · NOTHING LEAVES YOUR BROWSER
              </p>
            </div>
          </div>
          <div className="mt-10 flex items-center gap-4 border-t border-mint/15 pt-5">
            <ECGLine className="h-6 flex-1 text-mint/60" />
            <span className="font-mono text-[10px] tracking-[0.24em] text-paper/40">© 2026 · EDUCATIONAL USE</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
