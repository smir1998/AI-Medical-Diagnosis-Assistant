/* ------------------------------------------------------------------ */
/*  Embedded clinical reference table — the SymptomEncoder's training  */
/*  data. Row counts reflect relative presentation frequency; symptom  */
/*  vocabulary is aligned to the public Disease–Symptom dataset.       */
/* ------------------------------------------------------------------ */

export interface TrainingRow {
  id: string; // matches DISEASES ids in medical.ts
  name: string;
  rows: number; // weighted presentation count in the source table
  symptoms: string[]; // symptom ids present (24-dim vocabulary)
}

export const TRAINING_SOURCE =
  "Curated clinical reference table · vocabulary aligned to the public Disease–Symptom dataset (Kaggle: itachi-uchiha58 / Ananya Ujjwal) and WHO disease fact sheets.";

export const SYMPTOM_DIMS = 24;

export const TRAINING_ROWS: TrainingRow[] = [
  {
    id: "influenza",
    name: "Influenza (Flu)",
    rows: 260,
    symptoms: ["fever", "chills", "cough", "muscle_aches", "fatigue", "headache", "sore_throat"],
  },
  {
    id: "covid19",
    name: "COVID-19",
    rows: 240,
    symptoms: ["fever", "cough", "fatigue", "shortness_breath", "loss_taste", "sore_throat", "headache", "muscle_aches"],
  },
  {
    id: "common_cold",
    name: "Common Cold",
    rows: 300,
    symptoms: ["runny_nose", "sneezing", "sore_throat", "cough", "headache", "fatigue"],
  },
  {
    id: "migraine",
    name: "Migraine",
    rows: 150,
    symptoms: ["headache", "nausea", "dizziness", "fatigue"],
  },
  {
    id: "tension_headache",
    name: "Tension Headache",
    rows: 170,
    symptoms: ["headache", "fatigue", "dizziness"],
  },
  {
    id: "pneumonia",
    name: "Pneumonia",
    rows: 200,
    symptoms: ["cough", "fever", "shortness_breath", "chest_pain", "chills", "fatigue"],
  },
  {
    id: "gastroenteritis",
    name: "Acute Gastroenteritis",
    rows: 220,
    symptoms: ["diarrhea", "vomiting", "nausea", "abdominal_pain", "fever"],
  },
  {
    id: "dengue",
    name: "Dengue Fever",
    rows: 120,
    symptoms: ["fever", "rash", "joint_pain", "muscle_aches", "headache", "nausea", "vomiting", "itching"],
  },
  {
    id: "allergic_rhinitis",
    name: "Allergic Rhinitis",
    rows: 280,
    symptoms: ["sneezing", "runny_nose", "itching", "cough"],
  },
  {
    id: "strep_throat",
    name: "Streptococcal Pharyngitis",
    rows: 310,
    symptoms: ["sore_throat", "fever", "headache"],
  },
  {
    id: "uti",
    name: "Urinary Tract Infection",
    rows: 160,
    symptoms: ["burning_urination", "frequent_urination", "abdominal_pain", "fever"],
  },
  {
    id: "anemia",
    name: "Iron-Deficiency Anemia",
    rows: 140,
    symptoms: ["fatigue", "dizziness", "headache", "shortness_breath", "weight_loss"],
  },
];

export const TRAINING_TOTAL_ROWS = TRAINING_ROWS.reduce((a, r) => a + r.rows, 0);
