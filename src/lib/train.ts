/* ------------------------------------------------------------------ */
/*  Real in-browser training: multinomial logistic regression          */
/*  trained with mini-batch SGD on the real disease–symptom            */
/*  associations, with measured (not invented) metrics.                */
/* ------------------------------------------------------------------ */

import { CONSOLE_TO_VOCAB, DISEASE_SYMPTOM_MATRIX } from "../data/diseaseSymptomDataset";

export interface PerClassMetric {
  name: string;
  precision: number;
  recall: number;
  f1: number;
  support: number;
}

export interface ModelMetrics {
  accuracy: number;
  macroPrecision: number;
  macroRecall: number;
  macroF1: number;
  perClass: PerClassMetric[];
  testRows: number;
}

export interface TrainedModel {
  vocab: string[];
  classes: string[];
  W: Float64Array; // classes × vocab, row-major
  b: Float64Array;
  metrics: ModelMetrics;
  lossHistory: number[];
  valAccHistory: number[];
  trainRows: number;
  epochs: number;
  seed: number;
}

export interface TrainOptions {
  epochs?: number;
  seed?: number;
  rowsPerClass?: number;
  onEpoch?: (epoch: number, loss: number, valAcc: number) => void;
  /** Yields between epochs so the UI can paint the loss curve. */
  yield?: () => Promise<void>;
}

/* ---------- deterministic PRNG (mulberry32) ---------- */

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- row synthesis from real associations ---------- */

interface Row {
  feats: number[]; // active vocab indices
  label: number;
}

function buildRows(vocab: string[], rowsPerClass: number, rng: () => number): Row[] {
  const vIdx = new Map(vocab.map((v, i) => [v, i]));
  const rows: Row[] = [];
  DISEASE_SYMPTOM_MATRIX.forEach((prof, label) => {
    for (let r = 0; r < rowsPerClass; r++) {
      const core = prof.symptoms.slice(0, Math.min(2, prof.symptoms.length));
      const rest = prof.symptoms.slice(2).filter(() => rng() < 0.72);
      const set = new Set<number>([...core, ...rest].map((s) => vIdx.get(s)!).filter((i) => i !== undefined));
      // realistic noise: occasional unrelated symptom
      if (rng() < 0.1) set.add(Math.floor(rng() * vocab.length));
      rows.push({ feats: [...set].sort((a, b) => a - b), label });
    }
  });
  // seeded shuffle
  for (let i = rows.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [rows[i], rows[j]] = [rows[j], rows[i]];
  }
  return rows;
}

/* ---------- softmax helpers ---------- */

function sparseLogits(model: Pick<TrainedModel, "W" | "b" | "vocab" | "classes">, feats: number[]): number[] {
  const { W, b, vocab, classes } = model;
  const logits = Array.from(b);
  for (const j of feats) {
    for (let c = 0; c < classes.length; c++) logits[c] += W[c * vocab.length + j];
  }
  return logits;
}

export function softmax(logits: number[]): number[] {
  const m = Math.max(...logits);
  const e = logits.map((l) => Math.exp(l - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / s);
}

/* ---------- evaluation: measured, on the held-out split ---------- */

function evaluate(model: TrainedModel, rows: Row[]): ModelMetrics {
  const nC = model.classes.length;
  const tp = new Array(nC).fill(0);
  const fp = new Array(nC).fill(0);
  const fn = new Array(nC).fill(0);
  let correct = 0;
  for (const row of rows) {
    const p = softmax(sparseLogits(model, row.feats));
    let pred = 0;
    for (let c = 1; c < nC; c++) if (p[c] > p[pred]) pred = c;
    if (pred === row.label) correct++;
    for (let c = 0; c < nC; c++) {
      if (pred === c && row.label === c) tp[c]++;
      else if (pred === c && row.label !== c) fp[c]++;
      else if (pred !== c && row.label === c) fn[c]++;
    }
  }
  const perClass: PerClassMetric[] = model.classes.map((name, c) => {
    const prec = tp[c] + fp[c] > 0 ? tp[c] / (tp[c] + fp[c]) : 0;
    const rec = tp[c] + fn[c] > 0 ? tp[c] / (tp[c] + fn[c]) : 0;
    const f1 = prec + rec > 0 ? (2 * prec * rec) / (prec + rec) : 0;
    return { name, precision: prec, recall: rec, f1, support: tp[c] + fn[c] };
  });
  const n = rows.length;
  return {
    accuracy: correct / n,
    macroPrecision: perClass.reduce((a, m) => a + m.precision, 0) / nC,
    macroRecall: perClass.reduce((a, m) => a + m.recall, 0) / nC,
    macroF1: perClass.reduce((a, m) => a + m.f1, 0) / nC,
    perClass,
    testRows: n,
  };
}

/* ---------- the trainer ---------- */

export async function trainModel(opts: TrainOptions = {}): Promise<TrainedModel> {
  const epochs = opts.epochs ?? 36;
  const seed = opts.seed ?? 20260214;
  const rowsPerClass = opts.rowsPerClass ?? 48;
  const rng = mulberry32(seed);

  const vocab = [...new Set(DISEASE_SYMPTOM_MATRIX.flatMap((p) => p.symptoms))].sort();
  const classes = DISEASE_SYMPTOM_MATRIX.map((p) => p.disease);
  const vIdx = new Map(vocab.map((v, i) => [v, i]));
  void vIdx;

  const rows = buildRows(vocab, rowsPerClass, rng);
  const cut = Math.floor(rows.length * 0.75);
  const trainRows = rows.slice(0, cut);
  const testRows = rows.slice(cut);

  const nC = classes.length;
  const nV = vocab.length;
  const W = new Float64Array(nC * nV);
  const b = new Float64Array(nC);

  const model: TrainedModel = {
    vocab,
    classes,
    W,
    b,
    metrics: { accuracy: 0, macroPrecision: 0, macroRecall: 0, macroF1: 0, perClass: [], testRows: 0 },
    lossHistory: [],
    valAccHistory: [],
    trainRows: trainRows.length,
    epochs,
    seed,
  };

  const batch = 32;
  const l2 = 1e-4;

  for (let ep = 0; ep < epochs; ep++) {
    const lr = 0.5 / (1 + ep * 0.14);
    // per-epoch shuffle
    for (let i = trainRows.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [trainRows[i], trainRows[j]] = [trainRows[j], trainRows[i]];
    }

    let lossSum = 0;
    for (let s = 0; s < trainRows.length; s += batch) {
      const gW = new Float64Array(nC * nV);
      const gB = new Float64Array(nC);
      const end = Math.min(s + batch, trainRows.length);
      const bs = end - s;
      for (let i = s; i < end; i++) {
        const row = trainRows[i];
        const p = softmax(sparseLogits(model, row.feats));
        lossSum -= Math.log(Math.max(p[row.label], 1e-12));
        for (const j of row.feats) {
          for (let c = 0; c < nC; c++) {
            const err = p[c] - (c === row.label ? 1 : 0);
            gW[c * nV + j] += err;
          }
        }
        for (let c = 0; c < nC; c++) gB[c] += p[c] - (c === row.label ? 1 : 0);
      }
      for (let k = 0; k < gW.length; k++) W[k] -= lr * (gW[k] / bs + l2 * W[k]);
      for (let c = 0; c < nC; c++) b[c] -= lr * (gB[c] / bs);
    }

    const loss = lossSum / trainRows.length;
    let valCorrect = 0;
    for (const row of testRows) {
      const p = softmax(sparseLogits(model, row.feats));
      let pred = 0;
      for (let c = 1; c < nC; c++) if (p[c] > p[pred]) pred = c;
      if (pred === row.label) valCorrect++;
    }
    const valAcc = valCorrect / testRows.length;

    model.lossHistory.push(loss);
    model.valAccHistory.push(valAcc);
    opts.onEpoch?.(ep, loss, valAcc);
    if (opts.yield) await opts.yield();
  }

  model.metrics = evaluate(model, testRows);
  return model;
}

/* ---------- inference from trained weights ---------- */

export interface Prediction {
  name: string;
  prob: number;
}

/** Maps console symptom ids into the real vocabulary, then runs the trained head. */
export function predictWithModel(model: TrainedModel, consoleSymptomIds: string[]): Prediction[] {
  const vIdx = new Map(model.vocab.map((v, i) => [v, i]));
  const feats = [
    ...new Set(
      consoleSymptomIds
        .map((id) => CONSOLE_TO_VOCAB[id])
        .filter((v): v is string => v !== null)
        .map((v) => vIdx.get(v))
        .filter((i): i is number => i !== undefined)
    ),
  ].sort((a, b) => a - b);

  if (feats.length === 0) return [];
  const p = softmax(sparseLogits(model, feats));
  return model.classes
    .map((name, c) => ({ name, prob: p[c] }))
    .sort((a, b) => b.prob - a.prob);
}
