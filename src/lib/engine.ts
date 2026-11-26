import {
  DISEASES,
  RED_FLAG_SINGLE,
  RED_FLAG_COMBOS,
  SYMPTOMS,
  DURATIONS,
} from "../data/medical";
import type { Disease } from "../data/medical";
import { TRAINING_ROWS } from "../data/training";
import { evidenceGamma, nbPosteriors } from "./naiveBayes";

/* ---------- deterministic pseudo-random helpers ---------- */

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* ---------- symptom inference ---------- */

export interface ScoredDisease {
  disease: Disease;
  confidence: number; // 0..100
  matched: string[]; // matched symptom labels
}

export interface SymptomResult {
  scored: ScoredDisease[];
  /** Labels of individually flagged red-flag symptoms (no sentence boilerplate). */
  redFlagSymptoms: string[];
  /** Clinical combination notes only (e.g. meningitis triad, cardiac pairing). */
  redFlags: string[];
  meta: {
    symptomLabels: string[];
    duration: string;
    severity: number;
    runId: string;
  };
}

export function analyzeSymptoms(
  selectedIds: string[],
  durationIdx: number,
  severity: number
): SymptomResult {
  // Evidence strength: thin evidence → wide posteriors; a full review sharpens them.
  const durationFactor = [0.92, 1.0, 1.05, 1.1][Math.min(durationIdx, 3)];
  const severityFactor = 0.85 + (severity / 10) * 0.3;
  const gamma = evidenceGamma(selectedIds.length) * durationFactor * severityFactor;

  // Trained multinomial NB posterior over the reference table (no hand-tuning).
  const posteriors = nbPosteriors(selectedIds, gamma);
  const trainingById = new Map(TRAINING_ROWS.map((r) => [r.id, r]));
  const selectedSet = new Set(selectedIds);

  const scored: ScoredDisease[] = posteriors.map((p) => {
    const d = DISEASES.find((x) => x.id === p.id) ?? DISEASES[0];
    const profile = trainingById.get(p.id);
    const matched = profile
      ? profile.symptoms.filter((s) => selectedSet.has(s))
      : [];
    return {
      disease: d,
      confidence: p.confidence,
      matched: matched.map((id) => SYMPTOMS.find((s) => s.id === id)?.label ?? id),
    };
  });

  const redFlagSymptoms: string[] = [];
  for (const id of selectedIds) {
    if (RED_FLAG_SINGLE.includes(id)) {
      const label = SYMPTOMS.find((s) => s.id === id)?.label ?? id;
      redFlagSymptoms.push(label);
    }
  }
  const redFlags: string[] = [];
  for (const combo of RED_FLAG_COMBOS) {
    if (combo.ids.every((id) => selectedIds.includes(id))) redFlags.push(combo.note);
  }

  const runId = `SX-${String(hashString(selectedIds.join("|") + durationIdx + severity) % 9973).padStart(4, "0")}`;

  return {
    scored,
    redFlagSymptoms: [...new Set(redFlagSymptoms)],
    redFlags: [...new Set(redFlags)].slice(0, 4),
    meta: {
      symptomLabels: selectedIds.map((id) => SYMPTOMS.find((s) => s.id === id)?.label ?? id),
      duration: DURATIONS[durationIdx] ?? DURATIONS[0],
      severity,
      runId,
    },
  };
}

/* ---------- misc formatting ---------- */

export function nowTime(): string {
  return new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
