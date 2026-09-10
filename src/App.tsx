import { useState } from "react";
import { StatusBar } from "./components/StatusBar";
import { PatientRegistry, type Patient } from "./components/PatientRegistry";
import { SymptomChecker } from "./components/SymptomChecker";
import { ImageAnalysis } from "./components/ImageAnalysis";
import { Chatbot } from "./components/Chatbot";
import { ReportPanel } from "./components/ReportPanel";
import { ModelRegistry } from "./components/ModelRegistry";

type Tab = "patient" | "symptom" | "image" | "chat";

export default function App() {
  const [tab, setTab] = useState<Tab>("patient");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [activePatientId, setActivePatientId] = useState<string | null>(null);
  const [symptomResult, setSymptomResult] = useState<any>(null);
  const [imageResult, setImageResult] = useState<any>(null);

  const activePatient = patients.find((p) => p.id === activePatientId) || null;

  const handleAdmit = (p: Patient) => {
    setPatients([p, ...patients]);
    setActivePatientId(p.id);
  };

  const handleDischarge = (id: string) => {
    setPatients(patients.map((p) => (p.id === id ? { ...p, status: "discharged" as const } : p)));
  };

  const handleRemove = (id: string) => {
    setPatients(patients.filter((p) => p.id !== id));
    if (activePatientId === id) setActivePatientId(null);
  };

  return (
    <div className="min-h-screen">
      <div className="noise-overlay" aria-hidden="true" />
      <StatusBar />

      {/* Hero */}
      <section className="border-b border-ink/15">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <h2 className="font-display text-5xl font-black tracking-tight sm:text-6xl">
            DIAGNOSTIC
            <br />
            <span className="text-teal">CONSOLE</span>
            <span className="text-alert">_</span>
          </h2>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-inksoft">
            An AI triage workstation with four diagnostic heads — symptom encoder, chest X-ray CNN,
            dermoscopy classifier, and medical NLP desk — powered by verified Hugging Face models with
            real published metrics.
          </p>
        </div>
      </section>

      {/* Main Console */}
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        {/* Tab Navigation */}
        <div className="mb-6 flex flex-wrap gap-1 border-b-2 border-ink/20">
          {[
            { id: "patient", label: "Patient Registry", icon: "M12 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" },
            { id: "symptom", label: "Symptom Lab", icon: "M9.5 3a3 3 0 0 0-3 3 3.2 3.2 0 0 0-2.4 5A3.2 3.2 0 0 0 6.5 16a3 3 0 0 0 3 3 2.8 2.8 0 0 0 2.5-1.5V4.5A3 3 0 0 0 9.5 3zM14.5 3a3 3 0 0 1 3 3 3.2 3.2 0 0 1 2.4 5 3.2 3.2 0 0 1-2.4 5 3 3 0 0 1-3 3 2.8 2.8 0 0 1-2.5-1.5V4.5A3 2.8 0 0 1 14.5 3z" },
            { id: "image", label: "Radiology Lab", icon: "M3 7V4a1 1 0 0 1 1-1h3M17 3h3a1 1 0 0 1 1 1v3M21 17v3a1 1 0 0 1-1 1h-3M7 21H4a1 1 0 0 1-1-1v-3M3 12h18" },
            { id: "chat", label: "NLP Desk", icon: "M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5z" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as Tab)}
              className={`group relative inline-flex items-center gap-2.5 border-2 px-4 py-3 text-left transition-all duration-200 ${
                tab === t.id
                  ? "border-ink border-b-paper bg-paper text-ink"
                  : "border-ink/20 bg-paperdeep/60 text-inksoft hover:border-ink/50"
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path d={t.icon} />
              </svg>
              <span className="font-display text-[13px] font-extrabold uppercase tracking-wide">{t.label}</span>
              {tab === t.id && <span className="absolute inset-x-3 top-0 h-1 bg-alert" />}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="border-2 border-ink bg-paper p-5 shadow-[9px_9px_0_0_rgba(11,47,45,0.85)] sm:p-7">
          {tab === "patient" && (
            <PatientRegistry
              patients={patients}
              activeId={activePatientId}
              onAdmit={handleAdmit}
              onActivate={setActivePatientId}
              onDischarge={handleDischarge}
              onRemove={handleRemove}
            />
          )}
          {tab === "symptom" && (
            <SymptomChecker
              onComplete={(result) => {
                setSymptomResult(result);
                setTab("patient");
              }}
            />
          )}
          {tab === "image" && (
            <ImageAnalysis
              onComplete={(result) => {
                setImageResult(result);
                setTab("patient");
              }}
            />
          )}
          {tab === "chat" && <Chatbot />}
        </div>

        {/* Report */}
        {(symptomResult || imageResult) && (
          <div className="mt-8">
            <ReportPanel symptom={symptomResult} image={imageResult} patient={activePatient} />
          </div>
        )}
      </main>

      {/* Model Registry */}
      <ModelRegistry />

      {/* Footer */}
      <footer className="dark-grid border-t-4 border-alert text-paper">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs tracking-widest text-paper/60">
              MEDLENS·AI — DEEP LEARNING IN HEALTH CARE
            </p>
            <p className="font-mono text-xs tracking-widest text-paper/40">© 2026 · EDUCATIONAL USE</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
