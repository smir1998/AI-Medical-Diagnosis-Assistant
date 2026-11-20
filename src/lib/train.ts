import type { DiseaseDataset } from "./diseaseDataset";

export interface ModelMetrics {
  accuracy: number;
  macroPrecision: number;
  macroRecall: number;
  macroF1: number;
  testRows: number;
  testProfiles: number;
  perClass: Array<{
    name: string;
    support: number;
    precision: number;
    recall: number;
    f1: number;
  }>;
}

export interface TrainedModel {
  weights: number[][];
  biases: number[];
  classes: string[];
  symptomVocab: string[];
  sourceRows: number;
  uniqueProfiles: number;
  trainingRows: number;
  metrics: ModelMetrics;
  lossHistory: number[];
}

export interface TrainOptions {
  epochs: number;
  dataset: DiseaseDataset;
  onEpoch?: (epoch: number, loss: number, valAcc: number) => void;
}

interface EncodedRow {
  activeFeatures: number[];
  label: number;
}

interface ProfileGroup {
  signature: string;
  label: number;
  rows: EncodedRow[];
}

interface Prediction {
  predicted: number;
  actual: number;
}

function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function softmax(logits: number[]): number[] {
  const maxLogit = Math.max(...logits);
  const exps = logits.map((value) => Math.exp(value - maxLogit));
  const sum = exps.reduce((total, value) => total + value, 0);
  return exps.map((value) => value / sum);
}

function logitsFor(activeFeatures: number[], weights: number[][], biases: number[]): number[] {
  return weights.map((classWeights, classIndex) => {
    let total = biases[classIndex];
    for (const featureIndex of activeFeatures) total += classWeights[featureIndex];
    return total;
  });
}

function encodeDataset(dataset: DiseaseDataset, classes: string[]): EncodedRow[] {
  const classIndex = new Map(classes.map((name, index) => [name, index]));
  return dataset.rows.map((row) => {
    const label = classIndex.get(row.disease);
    if (label === undefined) throw new Error(`Unknown dataset label: ${row.disease}`);
    return {
      activeFeatures: row.symptoms.flatMap((value, index) => (value ? [index] : [])),
      label,
    };
  });
}

function splitByUniqueProfile(rows: EncodedRow[], numClasses: number) {
  const groupsBySignature = new Map<string, ProfileGroup>();
  for (const row of rows) {
    const signature = row.activeFeatures.join(",");
    const existing = groupsBySignature.get(signature);
    if (existing && existing.label !== row.label) {
      throw new Error("The dataset assigns different labels to the same symptom profile; a safe holdout split is not possible.");
    }
    if (existing) existing.rows.push(row);
    else groupsBySignature.set(signature, { signature, label: row.label, rows: [row] });
  }

  const groupsByClass = Array.from({ length: numClasses }, () => [] as ProfileGroup[]);
  for (const group of groupsBySignature.values()) groupsByClass[group.label].push(group);

  const random = createRandom(42);
  const trainingRows: EncodedRow[] = [];
  const holdoutRows: EncodedRow[] = [];
  let holdoutProfiles = 0;

  for (const classGroups of groupsByClass) {
    const shuffledGroups = shuffle(classGroups, random);
    // Hold out about 20% of unique profiles per class, keeping duplicates together.
    const holdoutCount = shuffledGroups.length > 1
      ? Math.max(1, Math.min(shuffledGroups.length - 1, Math.round(shuffledGroups.length * 0.2)))
      : 0;
    const heldOut = new Set(shuffledGroups.slice(0, holdoutCount).map((group) => group.signature));
    holdoutProfiles += heldOut.size;

    for (const group of classGroups) {
      (heldOut.has(group.signature) ? holdoutRows : trainingRows).push(...group.rows);
    }
  }

  return {
    trainingRows,
    holdoutRows,
    uniqueProfiles: groupsBySignature.size,
    holdoutProfiles,
  };
}

function evaluate(rows: EncodedRow[], weights: number[][], biases: number[], classes: string[], profileCount: number): ModelMetrics {
  const predictions: Prediction[] = rows.map((row) => {
    const logits = logitsFor(row.activeFeatures, weights, biases);
    return { predicted: logits.indexOf(Math.max(...logits)), actual: row.label };
  });

  const perClass = classes.map((name, classIndex) => {
    const tp = predictions.filter((p) => p.predicted === classIndex && p.actual === classIndex).length;
    const fp = predictions.filter((p) => p.predicted === classIndex && p.actual !== classIndex).length;
    const fn = predictions.filter((p) => p.predicted !== classIndex && p.actual === classIndex).length;
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    return { name, support: tp + fn, precision, recall, f1 };
  });

  const mean = (values: number[]) => values.reduce((total, value) => total + value, 0) / Math.max(values.length, 1);
  return {
    accuracy: predictions.filter((p) => p.predicted === p.actual).length / Math.max(predictions.length, 1),
    macroPrecision: mean(perClass.map((item) => item.precision)),
    macroRecall: mean(perClass.map((item) => item.recall)),
    macroF1: mean(perClass.map((item) => item.f1)),
    testRows: rows.length,
    testProfiles: profileCount,
    perClass,
  };
}

export async function trainModel(options: TrainOptions): Promise<TrainedModel> {
  const { epochs, dataset, onEpoch } = options;
  if (!Number.isInteger(epochs) || epochs < 1) throw new Error("Training needs at least one epoch.");
  if (dataset.rows.length === 0 || dataset.symptomVocab.length === 0) throw new Error("The disease dataset has no usable rows.");

  const classes = [...new Set(dataset.rows.map((row) => row.disease))].sort();
  const numClasses = classes.length;
  const numFeatures = dataset.symptomVocab.length;
  const rows = encodeDataset(dataset, classes);
  const split = splitByUniqueProfile(rows, numClasses);
  if (split.trainingRows.length === 0 || split.holdoutRows.length === 0) {
    throw new Error("The dataset needs multiple unique symptom profiles per class to create a grouped holdout.");
  }

  const random = createRandom(2026);
  const weights = Array.from({ length: numClasses }, () =>
    Array.from({ length: numFeatures }, () => (random() - 0.5) * 0.02)
  );
  const biases = new Array(numClasses).fill(0);
  const lossHistory: number[] = [];
  const learningRate = 0.02;
  const batchSize = 64;

  for (let epoch = 0; epoch < epochs; epoch++) {
    const epochRows = shuffle(split.trainingRows, random);
    let totalLoss = 0;

    for (let offset = 0; offset < epochRows.length; offset += batchSize) {
      const batch = epochRows.slice(offset, offset + batchSize);
      const gradientWeights = Array.from({ length: numClasses }, () => new Array(numFeatures).fill(0));
      const gradientBiases = new Array(numClasses).fill(0);

      for (const row of batch) {
        const probabilities = softmax(logitsFor(row.activeFeatures, weights, biases));
        totalLoss -= Math.log(Math.max(probabilities[row.label], 1e-12));
        for (let classIndex = 0; classIndex < numClasses; classIndex++) {
          const error = probabilities[classIndex] - (classIndex === row.label ? 1 : 0);
          gradientBiases[classIndex] += error;
          for (const featureIndex of row.activeFeatures) gradientWeights[classIndex][featureIndex] += error;
        }
      }

      for (let classIndex = 0; classIndex < numClasses; classIndex++) {
        for (let featureIndex = 0; featureIndex < numFeatures; featureIndex++) {
          weights[classIndex][featureIndex] -= learningRate * gradientWeights[classIndex][featureIndex] / batch.length;
        }
        biases[classIndex] -= learningRate * gradientBiases[classIndex] / batch.length;
      }
    }

    const avgLoss = totalLoss / split.trainingRows.length;
    const holdout = evaluate(split.holdoutRows, weights, biases, classes, split.holdoutProfiles);
    lossHistory.push(avgLoss);
    onEpoch?.(epoch, avgLoss, holdout.accuracy);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }

  return {
    weights,
    biases,
    classes,
    symptomVocab: dataset.symptomVocab,
    sourceRows: dataset.rows.length,
    uniqueProfiles: split.uniqueProfiles,
    trainingRows: split.trainingRows.length,
    lossHistory,
    metrics: evaluate(split.holdoutRows, weights, biases, classes, split.holdoutProfiles),
  };
}

export function predictWithModel(model: TrainedModel, symptoms: string[]): Array<{ name: string; prob: number }> {
  const symptomToIndex = new Map(model.symptomVocab.map((symptom, index) => [symptom, index]));
  const activeFeatures = [...new Set(symptoms.flatMap((symptom) => {
    const index = symptomToIndex.get(symptom);
    return index === undefined ? [] : [index];
  }))];
  if (activeFeatures.length === 0) return [];

  const probabilities = softmax(logitsFor(activeFeatures, model.weights, model.biases));
  return model.classes
    .map((name, index) => ({ name, prob: probabilities[index] }))
    .sort((a, b) => b.prob - a.prob);
}
