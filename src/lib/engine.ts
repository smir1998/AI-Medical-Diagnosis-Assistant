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

export function rand01(seed: number): number {
  const x = Math.imul(seed ^ 0x9e3779b9, 2654435761) >>> 0;
  return (x % 100000) / 100000;
}

/* ---------- symptom inference ---------- */

export interface ScoredDisease {
  disease: Disease;
  confidence: number; // 0..100
  matched: string[]; // matched symptom labels
}

export interface SymptomResult {
  scored: ScoredDisease[];
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

  const redFlags: string[] = [];
  for (const id of selectedIds) {
    if (RED_FLAG_SINGLE.includes(id)) {
      const label = SYMPTOMS.find((s) => s.id === id)?.label ?? id;
      redFlags.push(`${label} is a red-flag symptom — do not rely on an AI estimate for it.`);
    }
  }
  for (const combo of RED_FLAG_COMBOS) {
    if (combo.ids.every((id) => selectedIds.includes(id))) redFlags.push(combo.note);
  }

  const runId = `SX-${String(hashString(selectedIds.join("|") + durationIdx + severity) % 9973).padStart(4, "0")}`;

  return {
    scored,
    redFlags: [...new Set(redFlags)].slice(0, 4),
    meta: {
      symptomLabels: selectedIds.map((id) => SYMPTOMS.find((s) => s.id === id)?.label ?? id),
      duration: DURATIONS[durationIdx] ?? DURATIONS[0],
      severity,
      runId,
    },
  };
}

/* ---------- image inference (simulated CNN) ---------- */

export interface ImageResult {
  source: "pneumonia-sample" | "normal-sample" | "upload";
  fileName: string;
  normal: number;
  pneumonia: number;
  heat: { x: number; y: number; size: number };
  runId: string;
}

export function predictImage(source: ImageResult["source"], fileName: string, seedKey: string): ImageResult {
  const h = hashString(seedKey + fileName + source);
  let pneumonia: number;
  let heat: ImageResult["heat"];

  if (source === "pneumonia-sample") {
    pneumonia = 89 + rand01(h) * 7;
    heat = { x: 62 + rand01(h ^ 7) * 12, y: 60 + rand01(h ^ 13) * 14, size: 30 + rand01(h ^ 29) * 12 };
  } else if (source === "normal-sample") {
    pneumonia = 2.5 + rand01(h) * 4.5;
    heat = { x: 30 + rand01(h ^ 7) * 40, y: 30 + rand01(h ^ 13) * 30, size: 14 + rand01(h ^ 29) * 8 };
  } else {
    pneumonia = rand01(h) < 0.42 ? 62 + rand01(h ^ 3) * 33 : 4 + rand01(h ^ 5) * 26;
    heat = { x: 35 + rand01(h ^ 7) * 35, y: 38 + rand01(h ^ 13) * 32, size: 18 + rand01(h ^ 29) * 20 };
  }

  pneumonia = Math.round(pneumonia * 10) / 10;
  return {
    source,
    fileName,
    normal: Math.round((100 - pneumonia) * 10) / 10,
    pneumonia,
    heat,
    runId: `CX-${String(h % 9973).padStart(4, "0")}`,
  };
}

export const CNN_LOG: { stage: number; line: string }[] = [
  { stage: 0, line: "▸ decoding image buffer … ok" },
  { stage: 1, line: "▸ cv2.resize → (224, 224, 3)" },
  { stage: 1, line: "▸ normalize: pixel / 255.0 → [0,1]" },
  { stage: 2, line: "▸ Conv2D 32×(3,3) relu → (222,222,32)" },
  { stage: 2, line: "▸ MaxPooling2D (2,2) → (111,111,32)" },
  { stage: 2, line: "▸ Conv2D 64×(3,3) relu → (109,109,64)" },
  { stage: 2, line: "▸ MaxPooling2D (2,2) → (54,54,64)" },
  { stage: 2, line: "▸ Dropout(0.35)" },
  { stage: 3, line: "▸ Flatten → Dense(128, relu)" },
  { stage: 3, line: "▸ Dense(2, softmax) → probabilities" },
  { stage: 4, line: "▸ Grad-CAM: upsampled attention map" },
  { stage: 4, line: "✓ inference complete" },
];

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
