/* ------------------------------------------------------------------ */
/*  Multinomial Naive Bayes symptom classifier.                        */
/*  Trained at module load from the embedded clinical reference table  */
/*  — every weight below is computed from data, not hand-tuned.        */
/* ------------------------------------------------------------------ */

import { TRAINING_ROWS, TRAINING_TOTAL_ROWS, SYMPTOM_DIMS } from "../data/training";

export const NB_ALPHA = 1; // Laplace smoothing

export interface NBModel {
  logPrior: Map<string, number>;
  /** log P(symptom present | disease), Laplace-smoothed */
  logLik: Map<string, Map<string, number>>;
  rows: number;
  diseases: number;
  dims: number;
}

/** One training pass over the reference table. Pure and deterministic. */
export function trainNaiveBayes(): NBModel {
  const logPrior = new Map<string, number>();
  const logLik = new Map<string, Map<string, number>>();

  for (const row of TRAINING_ROWS) {
    logPrior.set(row.id, Math.log(row.rows / TRAINING_TOTAL_ROWS));
    const present = new Set(row.symptoms);
    const perSymptom = new Map<string, number>();
    for (const s of present) {
      perSymptom.set(s, Math.log((row.rows + NB_ALPHA) / (row.rows + 2 * NB_ALPHA)));
    }
    logLik.set(row.id, perSymptom);
  }

  return {
    logPrior,
    logLik,
    rows: TRAINING_TOTAL_ROWS,
    diseases: TRAINING_ROWS.length,
    dims: SYMPTOM_DIMS,
  };
}

export const NB_MODEL: NBModel = trainNaiveBayes();

/**
 * Evidence-count tempering: thin evidence (1–2 symptoms) yields wide,
 * humble posteriors; a full review sharpens them. γ ∈ [0.25, 1].
 */
export function evidenceGamma(nSelected: number): number {
  const t = Math.min(nSelected, 8) / 8;
  return 0.25 + 0.75 * Math.pow(t, 1.5);
}

/**
 * Posterior distribution over every disease given the selected symptom ids.
 * Returns entries sorted by descending confidence, confidences in [0,100].
 */
export function nbPosteriors(
  selectedIds: string[],
  gamma: number
): { id: string; confidence: number }[] {
  const scores: { id: string; s: number }[] = [];

  for (const row of TRAINING_ROWS) {
    const present = NB_MODEL.logLik.get(row.id)!;
    const miss = Math.log(NB_ALPHA / (row.rows + 2 * NB_ALPHA)); // P(present | symptom not in profile)
    let logP = NB_MODEL.logPrior.get(row.id)!;
    for (const s of selectedIds) {
      logP += present.get(s) ?? miss;
    }
    scores.push({ id: row.id, s: gamma * logP });
  }

  const max = Math.max(...scores.map((x) => x.s));
  const exps = scores.map((x) => Math.exp(x.s - max));
  const sum = exps.reduce((a, b) => a + b, 0);

  return scores
    .map((x, i) => ({ id: x.id, confidence: (exps[i] / sum) * 100 }))
    .sort((a, b) => b.confidence - a.confidence);
}
