import { useState } from "react";
import type { ImageResult, SymptomResult } from "../lib/engine";
import type { DermResult } from "./DermScan";
import type { Patient } from "./PatientRegistry";
import { TRIAGE_META } from "./PatientRegistry";
import { Icon } from "./ui";

interface Props {
  symptom: SymptomResult | null;
  image: ImageResult | null;
  derm?: DermResult | null;
  patient?: Patient | null;
}

export function ReportPanel({ symptom, image, derm, patient }: Props) {
  const [pdfState, setPdfState] = useState<"idle" | "busy" | "saved">("idle");
  if (!symptom && !image && !derm) return null;

  const top = symptom?.scored[0];
  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const reportId = `PT-${new Date().toISOString().slice(0, 10).replace(/-/g, "").slice(2)}-${(
    symptom?.meta.runId ?? image?.runId ?? (derm ? `DS-${derm.time.replace(/:/g, "")}` : "0000")
  )}`;

  /* true PDF export — jsPDF is lazy-loaded on first click */
  const downloadPdf = async () => {
    if (pdfState === "busy") return;
    setPdfState("busy");
    try {
      const { buildReportPlan, downloadReportPdf } = await import("../lib/pdf");
      const plan = buildReportPlan(symptom, image, derm ?? null, patient ?? null, reportId);
      await downloadReportPdf(plan);
      setPdfState("saved");
      window.setTimeout(() => setPdfState("idle"), 1800);
    } catch {
      setPdfState("idle");
    }
  };

  const vitalParts = patient
    ? [
        patient.vitals.hr !== undefined ? `HR ${patient.vitals.hr} bpm` : "",
        patient.vitals.sys !== undefined && patient.vitals.dia !== undefined
          ? `BP ${patient.vitals.sys}/${patient.vitals.dia}`
          : "",
        patient.vitals.spo2 !== undefined ? `SpO₂ ${patient.vitals.spo2}%` : "",
        patient.vitals.temp !== undefined ? `T ${patient.vitals.temp}°C` : "",
      ].filter(Boolean)
    : [];

  return (
    <section id="report" aria-label="Patient analysis report">
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-black tracking-tight">
          Patient analysis report<span className="text-alert">.</span>
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={downloadPdf}
            disabled={pdfState === "busy"}
            className={`inline-flex items-center gap-2 border-2 px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
              pdfState === "saved"
                ? "border-teal bg-teal text-paper"
                : "border-teal bg-teal/10 text-teal hover:-translate-y-0.5 hover:bg-teal hover:text-paper hover:shadow-[4px_4px_0_0_rgba(11,47,45,0.9)]"
            } disabled:opacity-60`}
          >
            {pdfState === "busy" ? (
              <>
                <Icon name="layers" className="h-4 w-4 spin-slow" /> Composing…
              </>
            ) : pdfState === "saved" ? (
              <>
                <Icon name="check" className="h-4 w-4" /> Saved
              </>
            ) : (
              <>
                <Icon name="report" className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5" />
                Download PDF
              </>
            )}
          </button>
          <button
            onClick={() => window.print()}
            className="group inline-flex items-center gap-2 border-2 border-ink bg-paper px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider transition-all duration-200 hover:-translate-y-0.5 hover:bg-ink hover:text-paper hover:shadow-[4px_4px_0_0_rgba(14,124,114,0.9)]"
          >
            <Icon name="print" className="h-4 w-4" /> Print
          </button>
        </div>
      </div>

      <div className="report-card border-2 border-ink bg-paper shadow-[9px_9px_0_0_rgba(12,43,43,0.9)]">
        {/* letterhead */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink bg-pine px-5 py-4 text-paper">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center bg-teal">
              <Icon name="pulse" className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display text-base font-black tracking-tight">MedLens·AI — Patient Analysis Report</p>
              <p className="font-mono text-[9px] tracking-[0.24em] text-mint/70">
                DECISION-SUPPORT DOCUMENT · NOT A CLINICAL DIAGNOSIS
              </p>
            </div>
          </div>
          <div className="text-right font-mono text-[10px] leading-relaxed text-paper/70">
            <p>ID: {reportId}</p>
            <p>DATE: {today}</p>
          </div>
        </div>

        {/* patient banner — stamped from the registrar */}
        <div className="flex flex-wrap items-center gap-x-8 gap-y-1 border-b border-ink/20 bg-paperdeep/60 px-5 py-2.5 font-mono text-[11px]">
          {patient ? (
            <>
              <p>
                <span className="text-inksoft">PATIENT&nbsp;&nbsp;:</span>{" "}
                <span className="font-bold text-ink">{patient.name}</span> · {patient.age}y {patient.sex}
              </p>
              <p>
                <span className="text-inksoft">MRN&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</span> {patient.id}
              </p>
              <p>
                <span className="text-inksoft">TRIAGE&nbsp;&nbsp;&nbsp;&nbsp;:</span>{" "}
                <span className="font-bold">
                  {patient.triage} · {TRIAGE_META[patient.triage].label}
                </span>
              </p>
              {patient.complaint !== "—" && (
                <p>
                  <span className="text-inksoft">CC&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</span>{" "}
                  {patient.complaint}
                </p>
              )}
              <p>
                <span className="text-inksoft">ALLERGIES&nbsp;:</span> {patient.allergies}
              </p>
              {vitalParts.length > 0 && (
                <p>
                  <span className="text-inksoft">VITALS&nbsp;&nbsp;&nbsp;&nbsp;:</span> {vitalParts.join(" · ")}
                </p>
              )}
              {patient.flags.length > 0 && (
                <p className="font-bold text-alert">
                  <span className="font-normal text-inksoft">FLAGS&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</span>{" "}
                  ⚠ {patient.flags.join(" · ")}
                </p>
              )}
            </>
          ) : (
            <p className="text-inksoft/70">
              PATIENT : unregistered study — admit via the Registrar (Step 01) to stamp this report
            </p>
          )}
        </div>

        <div className="grid gap-0 md:grid-cols-[1.1fr_0.9fr]">
          {/* findings */}
          <div className="border-ink/15 px-5 py-4 md:border-r">
            <p className="mb-3 font-mono text-[10px] font-bold tracking-[0.28em] text-teal">── FINDINGS</p>

            {symptom && top && (
              <div className="space-y-2 font-mono text-xs leading-relaxed">
                <p>
                  <span className="text-inksoft">SYMPTOMS&nbsp;&nbsp;:</span>{" "}
                  {symptom.meta.symptomLabels.join(", ")}
                </p>
                <p>
                  <span className="text-inksoft">ONSET&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</span> {symptom.meta.duration} ·
                  severity {symptom.meta.severity}/10
                </p>
                <p>
                  <span className="text-inksoft">PREDICTION&nbsp;&nbsp;:</span>{" "}
                  <span className="font-bold text-ink">{top.disease.name}</span>{" "}
                  <span className="text-inksoft">({top.disease.code})</span>
                </p>
                <p>
                  <span className="text-inksoft">CONFIDENCE&nbsp;&nbsp;:</span>{" "}
                  <span className="font-bold text-teal">{top.confidence.toFixed(1)}%</span>{" "}
                  <span className="text-inksoft">· softmax posterior</span>
                </p>
                {symptom.scored[1] && (
                  <p>
                    <span className="text-inksoft">ALTERNATE&nbsp;&nbsp;&nbsp;:</span> {symptom.scored[1].disease.name}{" "}
                    ({symptom.scored[1].confidence.toFixed(1)}%)
                  </p>
                )}
                {(symptom.redFlagSymptoms.length > 0 || symptom.redFlags.length > 0) && (
                  <div className="mt-2 border border-alert/50 bg-alert/10 p-2.5 text-alertdeep">
                    <p className="mb-1 font-bold tracking-widest text-alert">⚠ RED FLAGS</p>
                    {symptom.redFlagSymptoms.length > 0 && (
                      <p className="font-bold uppercase tracking-wider">{symptom.redFlagSymptoms.join(" · ")}</p>
                    )}
                    {symptom.redFlags.map((f) => (
                      <p key={f}>• {f}</p>
                    ))}
                    <p className="mt-1.5 border-l-2 border-alert bg-paper px-2 py-1 font-bold tracking-wide">
                      DO NOT RELY ON AN AI ESTIMATE FOR IT.
                    </p>
                  </div>
                )}
              </div>
            )}

            {image && (
              <div className="space-y-2 font-mono text-xs leading-relaxed">
                <p className="font-mono text-[10px] font-bold tracking-[0.28em] text-teal">
                  {symptom ? "── IMAGING · CHEST X-RAY" : "── IMAGING · CHEST X-RAY"}
                </p>
                <p>
                  <span className="text-inksoft">STUDY&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</span> {image.fileName}
                </p>
                <p>
                  <span className="text-inksoft">RESULT&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</span>{" "}
                  <span className={`font-bold ${image.pneumonia > 50 ? "text-alert" : "text-teal"}`}>
                    {image.pneumonia > 50 ? "Pneumonia pattern" : "No pneumonia pattern"}
                  </span>
                </p>
                <p>
                  <span className="text-inksoft">PROBABILITIES&nbsp;:</span> pneumonia {image.pneumonia.toFixed(1)}% ·
                  normal {image.normal.toFixed(1)}%
                </p>
                <p>
                  <span className="text-inksoft">ATTENTION&nbsp;&nbsp;&nbsp;:</span> Grad-CAM hotspot at (
                  {image.heat.x.toFixed(0)}%, {image.heat.y.toFixed(0)}%)
                </p>
              </div>
            )}

            {derm && (
              <div className="mt-3 space-y-2 border-t border-dashed border-ink/25 pt-3 font-mono text-xs leading-relaxed">
                <p className="font-mono text-[10px] font-bold tracking-[0.28em] text-teal">
                  ── SCREENING · DERMATOSCOPY
                </p>
                <p>
                  <span className="text-inksoft">STUDY&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</span> {derm.fileName}
                </p>
                <p>
                  <span className="text-inksoft">PROFILE&nbsp;&nbsp;&nbsp;:</span>{" "}
                  <span
                    className={`font-bold ${
                      derm.melanoma >= 35 ? "text-alert" : derm.atypical >= 35 ? "text-amber" : "text-teal"
                    }`}
                  >
                    {derm.melanoma >= 35
                      ? "Melanoma-pattern risk"
                      : derm.atypical >= 35
                        ? "Atypical nevus pattern"
                        : "Benign pattern"}
                  </span>{" "}
                  — benign {derm.benign.toFixed(1)}% / atypical {derm.atypical.toFixed(1)}% / melanoma{" "}
                  {derm.melanoma.toFixed(1)}%
                </p>
                <p>
                  <span className="text-inksoft">ABCDE&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</span>{" "}
                  {derm.flags.map((f) => `${f.key}${f.status === "warn" ? "▲" : "✓"}`).join("  ")}
                </p>
              </div>
            )}
          </div>

          {/* recommendation + referral */}
          <div className="px-5 py-4">
            <p className="mb-3 font-mono text-[10px] font-bold tracking-[0.28em] text-alert">── RECOMMENDATION</p>
            <div className="space-y-3">
              {symptom?.scored[0] && (
                <div className="border-l-2 border-teal pl-3">
                  <p className="font-display text-sm font-extrabold">
                    Referral: {symptom.scored[0].disease.specialty}
                  </p>
                  <ul className="mt-1.5 space-y-1 pl-4 text-[13px] text-inksoft">
                    {symptom.scored[0].disease.recs.map((r) => (
                      <li key={r} className="list-disc">{r}</li>
                    ))}
                  </ul>
                </div>
              )}
              {image && image.pneumonia > 50 && (
                <p className="border-l-2 border-alert pl-3 text-[13px] text-alertdeep">
                  Elevated pneumonia probability — correlate with auscultation, SpO₂ and clinical picture.
                  Escalate to Pulmonology.
                </p>
              )}
              {derm && derm.melanoma >= 35 && (
                <p className="border-l-2 border-alert pl-3 text-[13px] text-alertdeep">
                  High-risk dermoscopy pattern — priority dermatology review within 2 weeks.
                </p>
              )}
              <p className="border border-dashed border-ink/30 bg-paperdeep/50 p-3 font-mono text-[10px] leading-relaxed text-inksoft">
                This report was generated by an educational simulation. It is not medical advice, a
                diagnosis, or a prescription. Consult a licensed healthcare professional before acting on
                any finding. In an emergency, call your local emergency number.
              </p>
              <p className="flex items-center gap-2 font-mono text-[10px] tracking-widest text-inksoft">
                <Icon name="doc" className="h-4 w-4 text-teal" /> SIGNED: MEDLENS·AI v3.2 · SIMULATED INFERENCE
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
