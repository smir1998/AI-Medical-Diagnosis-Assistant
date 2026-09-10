/* ------------------------------------------------------------------ */
/*  True PDF export — assembles a report plan (pure, testable) and     */
/*  renders it with jsPDF, which is lazy-loaded so the main bundle     */
/*  stays lean until the user actually downloads.                      */
/* ------------------------------------------------------------------ */

import type { ImageResult, SymptomResult } from "./engine";
import type { DermResult } from "../components/DermScan";
import type { Patient } from "../components/PatientRegistry";

export type PlanLine =
  | { kind: "heading"; text: string }
  | { kind: "sub"; text: string }
  | { kind: "kv"; k: string; v: string }
  | { kind: "text"; text: string }
  | { kind: "alert"; text: string }
  | { kind: "rule" };

export interface ReportPlan {
  fileName: string;
  reportId: string;
  date: string;
  lines: PlanLine[];
}

const DISCLAIMER =
  "Educational decision-support simulation — NOT a clinical diagnosis. A licensed clinician must confirm every finding before any care decision.";

export function buildReportPlan(
  symptom: SymptomResult | null,
  image: ImageResult | null,
  derm: DermResult | null,
  patient: Patient | null | undefined,
  reportId: string
): ReportPlan {
  const date = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const lines: PlanLine[] = [];

  lines.push({ kind: "heading", text: "PATIENT ANALYSIS REPORT" });
  lines.push({ kind: "sub", text: "MedLens·AI — Deep Learning in Health Care" });
  lines.push({ kind: "rule" });

  if (patient) {
    const vitals = [
      patient.vitals.hr !== undefined ? `HR ${patient.vitals.hr} bpm` : "",
      patient.vitals.sys !== undefined && patient.vitals.dia !== undefined
        ? `BP ${patient.vitals.sys}/${patient.vitals.dia}`
        : "",
      patient.vitals.spo2 !== undefined ? `SpO₂ ${patient.vitals.spo2}%` : "",
      patient.vitals.temp !== undefined ? `T ${patient.vitals.temp}°C` : "",
    ]
      .filter(Boolean)
      .join(" · ");
    lines.push({ kind: "kv", k: "PATIENT", v: `${patient.name} — ${patient.age}y ${patient.sex}` });
    lines.push({ kind: "kv", k: "MRN", v: patient.id });
    lines.push({ kind: "kv", k: "TRIAGE", v: `Level ${patient.triage}` });
    if (patient.complaint !== "—") lines.push({ kind: "kv", k: "CHIEF COMPLAINT", v: patient.complaint });
    lines.push({ kind: "kv", k: "ALLERGIES", v: patient.allergies });
    if (vitals) lines.push({ kind: "kv", k: "VITALS", v: vitals });
    if (patient.flags.length > 0) {
      lines.push({ kind: "alert", text: `CLINICAL FLAGS: ${patient.flags.join(" · ")}` });
    }
    lines.push({ kind: "rule" });
  } else {
    lines.push({ kind: "kv", k: "PATIENT", v: "Unregistered study" });
    lines.push({ kind: "rule" });
  }

  if (symptom) {
    const top = symptom.scored[0];
    lines.push({ kind: "heading", text: "SYMPTOM ANALYSIS" });
    lines.push({ kind: "kv", k: "PRESENTING", v: symptom.meta.symptomLabels.join(", ") || "—" });
    lines.push({ kind: "kv", k: "DURATION / SEVERITY", v: `${symptom.meta.duration} · ${symptom.meta.severity}/10` });
    if (top) {
      lines.push({
        kind: "kv",
        k: "PRIMARY (DX)",
        v: `${top.disease.name} — ${top.confidence.toFixed(1)}% (ICD-10 ${top.disease.code})`,
      });
    }
    const alt = symptom.scored[1];
    if (alt) {
      lines.push({ kind: "kv", k: "ALTERNATE", v: `${alt.disease.name} — ${alt.confidence.toFixed(1)}%` });
    }
    for (const f of symptom.redFlags) lines.push({ kind: "alert", text: `RED FLAG: ${f}` });
    if (symptom.redFlagSymptoms.length > 0) {
      lines.push({
        kind: "alert",
        text: `RED-FLAG SYMPTOMS: ${symptom.redFlagSymptoms.join(", ")} — do not rely on an AI estimate for it.`,
      });
    }
    if (top) {
      lines.push({ kind: "sub", text: `Referral: ${top.disease.specialty}` });
      for (const r of top.disease.recs) lines.push({ kind: "text", text: `• ${r}` });
    }
    lines.push({ kind: "rule" });
  }

  if (image) {
    lines.push({ kind: "heading", text: "IMAGING — CHEST X-RAY" });
    lines.push({ kind: "kv", k: "STUDY", v: image.fileName || "Uploaded radiograph" });
    lines.push({
      kind: "kv",
      k: "CLASSIFICATION",
      v: `Pneumonia ${image.pneumonia.toFixed(1)}% · Normal ${image.normal.toFixed(1)}%`,
    });
    lines.push({
      kind: "text",
      text:
        image.pneumonia > 50
          ? "• Consolidation pattern flagged — radiologist confirmation advised."
          : "• No consolidation pattern above threshold.",
    });
    lines.push({ kind: "rule" });
  }

  if (derm) {
    lines.push({ kind: "heading", text: "SCREENING — DERMATOSCOPY" });
    lines.push({ kind: "kv", k: "STUDY", v: derm.fileName });
    lines.push({
      kind: "kv",
      k: "PROFILE",
      v: `Benign ${derm.benign.toFixed(1)}% · Atypical ${derm.atypical.toFixed(1)}% · Melanoma-pattern ${derm.melanoma.toFixed(1)}%`,
    });
    lines.push({
      kind: "kv",
      k: "ABCDE",
      v: derm.flags.map((f) => `${f.key}${f.status === "warn" ? "▲" : "✓"}`).join("  "),
    });
    lines.push({ kind: "rule" });
  }

  lines.push({ kind: "alert", text: DISCLAIMER });
  lines.push({ kind: "sub", text: "Generated by MedLens·AI — all inference ran locally in the browser." });

  return { fileName: `MedLens-${reportId}.pdf`, reportId, date, lines };
}

/** Lazy jsPDF render — keeps the 350 kB library out of the first-paint bundle. */
export async function downloadReportPdf(plan: ReportPlan): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const M = 16;

  /* letterhead band */
  doc.setFillColor(11, 47, 44);
  doc.rect(0, 0, W, 30, "F");
  doc.setFillColor(14, 124, 114);
  doc.rect(0, 30, W, 1.6, "F");
  doc.setTextColor(245, 241, 230);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("MedLens·AI", M, 13);
  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  doc.setTextColor(143, 227, 207);
  doc.text("DEEP LEARNING IN HEALTH CARE — DECISION SUPPORT", M, 19);
  doc.setTextColor(245, 241, 230);
  doc.text(`ID ${plan.reportId}`, W - M, 13, { align: "right" });
  doc.text(`DATE ${plan.date}`, W - M, 19, { align: "right" });

  /* body */
  let y = 42;
  const lineH = 6;
  const ensure = (needed: number) => {
    if (y + needed > 280) {
      doc.addPage();
      y = 20;
    }
  };

  for (const l of plan.lines) {
    if (l.kind === "rule") {
      ensure(6);
      doc.setDrawColor(22, 36, 31);
      doc.setLineDashPattern([1.4, 1.4], 0);
      doc.line(M, y, W - M, y);
      doc.setLineDashPattern([], 0);
      y += 5;
      continue;
    }
    if (l.kind === "heading") {
      ensure(10);
      y += 2;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(14, 124, 114);
      doc.text(l.text, M, y);
      y += lineH + 1;
      continue;
    }
    if (l.kind === "sub") {
      ensure(lineH);
      doc.setFont("courier", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(87, 102, 95);
      doc.text(l.text, M, y);
      y += lineH;
      continue;
    }
    if (l.kind === "kv") {
      const wrapped = doc.splitTextToSize(l.v, W - M * 2 - 46);
      ensure(lineH * wrapped.length + 1);
      doc.setFont("courier", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(87, 102, 95);
      doc.text(l.k, M, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(22, 36, 31);
      doc.text(wrapped, M + 46, y);
      y += lineH * wrapped.length;
      continue;
    }
    if (l.kind === "alert") {
      const wrapped = doc.splitTextToSize(l.text, W - M * 2 - 8);
      const h = lineH * wrapped.length + 4;
      ensure(h + 2);
      doc.setFillColor(199, 70, 60);
      doc.rect(M, y - 4, W - M * 2, h, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(245, 241, 230);
      doc.text(wrapped, M + 4, y);
      y += h + 3;
      continue;
    }
    /* text */
    const wrapped = doc.splitTextToSize(l.text, W - M * 2 - 4);
    ensure(lineH * wrapped.length);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(22, 36, 31);
    doc.text(wrapped, M + 2, y);
    y += lineH * wrapped.length;
  }

  /* signature block */
  ensure(26);
  y += 6;
  doc.setDrawColor(22, 36, 31);
  doc.line(M, y, M + 62, y);
  doc.line(W - M - 62, y, W - M, y);
  doc.setFont("courier", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(87, 102, 95);
  doc.text("REVIEWING CLINICIAN", M, y + 4);
  doc.text("DATE / STAMP", W - M - 62, y + 4);

  /* footer */
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont("courier", "normal");
    doc.setFontSize(7);
    doc.setTextColor(120, 130, 125);
    doc.text(`MedLens·AI · ${plan.reportId} · page ${p}/${pages}`, W / 2, 291, { align: "center" });
  }

  doc.save(plan.fileName);
}
