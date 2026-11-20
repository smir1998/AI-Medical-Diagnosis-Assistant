export interface DiseaseDatasetRow {
  symptoms: number[];
  disease: string;
}

export interface DiseaseDataset {
  symptomVocab: string[];
  rows: DiseaseDatasetRow[];
}

function normalizeSymptomName(name: string): string {
  return name.trim().toLowerCase().replace(/_/g, " ").replace(/\s+/g, " ");
}

export function parseDiseaseDataset(csv: string): DiseaseDataset {
  const lines = csv.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error("The disease dataset is empty.");

  const headers = lines[0].split(",").map((cell) => cell.trim());
  const labelColumn = headers.findIndex((header) => header.toLowerCase() === "prognosis");
  if (labelColumn < 1) throw new Error("The dataset is missing its prognosis column.");

  const sourceFeatures = headers.slice(0, labelColumn).map(normalizeSymptomName);
  const symptomVocab = [...new Set(sourceFeatures)].sort();
  const vocabIndex = new Map(symptomVocab.map((symptom, index) => [symptom, index]));
  const sourceFeatureIndices = sourceFeatures.map((symptom) => vocabIndex.get(symptom)!);
  const rows: DiseaseDatasetRow[] = [];

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex++) {
    const cells = lines[lineIndex].split(",");
    if (cells.length !== headers.length) {
      throw new Error(`Dataset row ${lineIndex + 1} has ${cells.length} columns; expected ${headers.length}.`);
    }

    const disease = cells[labelColumn].trim();
    if (!disease) throw new Error(`Dataset row ${lineIndex + 1} has no prognosis label.`);

    const symptoms = new Array(symptomVocab.length).fill(0);
    for (let column = 0; column < labelColumn; column++) {
      const value = cells[column].trim();
      if (value !== "0" && value !== "1") {
        throw new Error(`Dataset row ${lineIndex + 1} contains a non-binary symptom value.`);
      }
      if (value === "1") symptoms[sourceFeatureIndices[column]] = 1;
    }
    rows.push({ symptoms, disease });
  }

  return { symptomVocab, rows };
}

export async function loadDiseaseDataset(): Promise<DiseaseDataset> {
  const url = new URL(`${import.meta.env.BASE_URL}Training.csv`, window.location.href);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load Training.csv (HTTP ${response.status}).`);
  return parseDiseaseDataset(await response.text());
}
