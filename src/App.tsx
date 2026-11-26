import { useState } from "react";
import { StatusBar } from "./components/StatusBar";
import { PatientRegistry, type Patient } from "./components/PatientRegistry";
import { SymptomChecker, type SymptomAnalysisResult } from "./components/SymptomChecker";
import { ImageAnalysis } from "./components/ImageAnalysis";
import { Chatbot } from "./components/Chatbot";
import { ReportPanel } from "./components/ReportPanel";
import { ModelRegistry } from "./components/ModelRegistry";
import { TrainingGrounds } from "./components/TrainingGrounds";
import type { ImageResult } from "./lib/pixel";

interface AnalysisReport {
  patientId: string | null;
  patient: Patient | null;
  symptom?: SymptomAnalysisResult;
  image?: ImageResult;
}

type Tab = "patient" | "symptom" | "image" | "chat";

export default function App() {
  const [tab, setTab] = useState<Tab>("patient");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [activePatientId, setActivePatientId] = useState<string | null>(null);
  const [report, setReport] = useState<AnalysisReport | null>(null);

  const activePatient = patients.find((p) => p.id === activePatientId) || null;

  const recordSymptomResult = (symptom: SymptomAnalysisResult) => {
    const patientSnapshot = activePatient
      ? { ...activePatient, vitals: { ...activePatient.vitals }, flags: [...activePatient.flags] }
      : null;
    setReport((previous) => {
      const samePatient = previous?.patientId === activePatientId;
      const current = samePatient
        ? previous
        : { patientId: activePatientId, patient: patientSnapshot };
      return { ...current, symptom };
    });
    setTab("patient");
  };

  const recordImageResult = (image: ImageResult) => {
    const patientSnapshot = activePatient
      ? { ...activePatient, vitals: { ...activePatient.vitals }, flags: [...activePatient.flags] }
      : null;
    setReport((previous) => {
      const samePatient = previous?.patientId === activePatientId;
      const current = samePatient
        ? previous
        : { patientId: activePatientId, patient: patientSnapshot };
      return { ...current, image };
    });
  };

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

  const handleClearAllPatients = () => {
    setPatients([]);
    setActivePatientId(null);
    setReport(null);
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
            An educational software demo, not a clinical decision-support tool. Symptom scores use a small reference table, and
            the radiology lab scores 18 findings on uploaded frontal chest X-rays using a research model. These outputs and
            activation heatmaps are not diagnoses, and this chest model cannot read other body parts.
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
              onClearAll={handleClearAllPatients}
            />
          )}
          {tab === "symptom" && (
            <SymptomChecker onComplete={recordSymptomResult} />
          )}
          {tab === "image" && (
            <ImageAnalysis onComplete={recordImageResult} />
          )}
          {tab === "chat" && <Chatbot />}
        </div>

        {/* Report */}
        {report && report.patientId === activePatientId && (report.symptom || report.image) && (
          <div className="mt-8">
            <ReportPanel symptom={report.symptom} image={report.image} patient={report.patient} />
          </div>
        )}
        {report && report.patientId !== activePatientId && (
          <p role="status" className="mt-8 border-l-2 border-amber bg-amber/10 px-4 py-3 text-sm text-ink">
            The previous analysis belongs to {report.patient?.name ?? "an unassigned session"}
            {report.patientId ? ` (${report.patientId})` : ""}. It is hidden while another chart is active.
          </p>
        )}
      </main>

      {/* Model Registry */}
      <ModelRegistry />

      {/* Training Grounds */}
      <TrainingGrounds onTrained={() => {}} />

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
