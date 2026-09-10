import { DISEASE_SYMPTOM_MATRIX } from "../data/diseaseSymptomDataset";

export interface ModelMetrics {
  accuracy: number;
  macroPrecision: number;
  macroRecall: number;
  macroF1: number;
  testRows: number;
  perClass: Array<{
    name: string;
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
  metrics: ModelMetrics;
  lossHistory: number[];
}

export interface TrainOptions {
  epochs: number;
  rowsPerClass?: number;
  onEpoch?: (epoch: number, loss: number, valAcc: number) => void;
}

function softmax(logits: number[]): number[] {
  const maxLogit = Math.max(...logits);
  const exps = logits.map((x) => Math.exp(x - maxLogit));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((x) => x / sum);
}

function crossEntropyLoss(probs: number[], target: number): number {
  return -Math.log(Math.max(probs[target], 1e-10));
}

export async function trainModel(options: TrainOptions): Promise<TrainedModel> {
  const { epochs, onEpoch } = options;
  const classes = DISEASE_SYMPTOM_MATRIX.map((d) => d.disease);
  const numClasses = classes.length;

  // Build symptom vocabulary from actual dataset
  const symptomSet = new Set<string>();
  DISEASE_SYMPTOM_MATRIX.forEach((d) => d.symptoms.forEach((s) => symptomSet.add(s)));
  const symptomVocab = Array.from(symptomSet).sort();
  const numFeatures = symptomVocab.length;
  const symptomToIndex = new Map(symptomVocab.map((s, i) => [s, i]));

  // Initialize weights and biases
  const weights: number[][] = Array.from({ length: numClasses }, () =>
    Array.from({ length: numFeatures }, () => (Math.random() - 0.5) * 0.1)
  );
  const biases: number[] = Array.from({ length: numClasses }, () => 0);

  // Prepare training data - encode actual symptom names
  const data = DISEASE_SYMPTOM_MATRIX.flatMap((d, labelIdx) =>
    Array.from({ length: 50 }, () => {
      const features = new Array(numFeatures).fill(0);
      d.symptoms.forEach((symptom) => {
        const idx = symptomToIndex.get(symptom);
        if (idx !== undefined) features[idx] = 1;
      });
      return { features, label: labelIdx };
    })
  );

  // Shuffle and split
  const shuffled = [...data].sort(() => Math.random() - 0.5);
  const trainData = shuffled.slice(0, Math.floor(shuffled.length * 0.8));
  const valData = shuffled.slice(Math.floor(shuffled.length * 0.8));

  const learningRate = 0.01;
  const batchSize = 32;

  for (let epoch = 0; epoch < epochs; epoch++) {
    // Shuffle training data
    const epochData = [...trainData].sort(() => Math.random() - 0.5);
    let totalLoss = 0;

    // Mini-batch SGD
    for (let i = 0; i < epochData.length; i += batchSize) {
      const batch = epochData.slice(i, i + batchSize);
      const gradW = Array.from({ length: numClasses }, () =>
        Array.from({ length: numFeatures }, () => 0)
      );
      const gradB = Array.from({ length: numClasses }, () => 0);

      for (const sample of batch) {
        const logits = weights.map((w, c) =>
          w.reduce((sum, wj, j) => sum + wj * sample.features[j], 0) + biases[c]
        );
        const probs = softmax(logits);
        const loss = crossEntropyLoss(probs, sample.label);
        totalLoss += loss;

        // Compute gradients
        for (let c = 0; c < numClasses; c++) {
          const error = probs[c] - (c === sample.label ? 1 : 0);
          for (let j = 0; j < numFeatures; j++) {
            gradW[c][j] += error * sample.features[j];
          }
          gradB[c] += error;
        }
      }

      // Update weights
      for (let c = 0; c < numClasses; c++) {
        for (let j = 0; j < numFeatures; j++) {
          weights[c][j] -= learningRate * (gradW[c][j] / batch.length);
        }
        biases[c] -= learningRate * (gradB[c] / batch.length);
      }
    }

    // Validation accuracy
    let correct = 0;
    for (const sample of valData) {
      const logits = weights.map((w, c) =>
        w.reduce((sum, wj, j) => sum + wj * sample.features[j], 0) + biases[c]
      );
      const predicted = logits.indexOf(Math.max(...logits));
      if (predicted === sample.label) correct++;
    }
    const valAcc = correct / valData.length;
    const avgLoss = totalLoss / trainData.length;

    if (onEpoch) {
      onEpoch(epoch, avgLoss, valAcc);
    }

    // Yield to UI
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  // Calculate final metrics
  const predictions: Array<{ predicted: number; actual: number }> = [];
  for (const sample of valData) {
    const logits = weights.map((w, c) =>
      w.reduce((sum, wj, j) => sum + wj * sample.features[j], 0) + biases[c]
    );
    const predicted = logits.indexOf(Math.max(...logits));
    predictions.push({ predicted, actual: sample.label });
  }

  const accuracy = predictions.filter((p) => p.predicted === p.actual).length / predictions.length;

  const perClass = classes.map((name, c) => {
    const tp = predictions.filter((p) => p.predicted === c && p.actual === c).length;
    const fp = predictions.filter((p) => p.predicted === c && p.actual !== c).length;
    const fn = predictions.filter((p) => p.predicted !== c && p.actual === c).length;

    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    return { name, precision, recall, f1 };
  });

  const macroPrecision = perClass.reduce((sum, c) => sum + c.precision, 0) / numClasses;
  const macroRecall = perClass.reduce((sum, c) => sum + c.recall, 0) / numClasses;
  const macroF1 = perClass.reduce((sum, c) => sum + c.f1, 0) / numClasses;

  return {
    weights,
    biases,
    classes,
    symptomVocab,
    lossHistory: [], // Simplified for now
    metrics: {
      accuracy,
      macroPrecision,
      macroRecall,
      macroF1,
      testRows: valData.length,
      perClass,
    },
  };
}

export function predictWithModel(model: TrainedModel, symptoms: string[]): Array<{ name: string; prob: number }> {
  const symptomToIndex = new Map(model.symptomVocab.map((s, i) => [s, i]));
  const features = new Array(model.symptomVocab.length).fill(0);
  symptoms.forEach((symptom) => {
    const idx = symptomToIndex.get(symptom);
    if (idx !== undefined) features[idx] = 1;
  });

  const logits = model.weights.map((w, c) =>
    w.reduce((sum, wj, j) => sum + wj * features[j], 0) + model.biases[c]
  );

  const probs = softmax(logits);
  
  return model.classes
    .map((name, i) => ({ name, prob: probs[i] }))
    .sort((a, b) => b.prob - a.prob);
}
