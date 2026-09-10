/* ------------------------------------------------------------------ */
/*  Real training data                                                 */
/*                                                                     */
/*  Disease → symptom associations are taken from the public Kaggle    */
/*  "Disease Symptom Prediction" dataset (itachi9604). Training rows   */
/*  are synthesized from those real associations (documented           */
/*  augmentation) so the full pipeline runs client-side.               */
/* ------------------------------------------------------------------ */

export const DATASET_SOURCE = {
  name: "Disease Symptom Prediction",
  author: "itachi9604",
  url: "https://www.kaggle.com/datasets/itachi9604/disease-symptom-description-dataset",
  note: "36 diseases · 132 symptoms · public healthcare dataset",
};

export interface DiseaseProfile {
  disease: string;
  symptoms: string[];
}

/** Real disease → symptom association matrix (public dataset, 30 classes subset). */
export const DISEASE_SYMPTOM_MATRIX: DiseaseProfile[] = [
  { disease: "Fungal infection", symptoms: ["itching", "skin rash", "nodal skin eruptions", "dischromic patches"] },
  { disease: "Allergy", symptoms: ["continuous sneezing", "shivering", "chills", "watering from eyes"] },
  { disease: "GERD", symptoms: ["stomach pain", "acidity", "ulcers on tongue", "cough", "chest pain"] },
  { disease: "Chronic cholestasis", symptoms: ["itching", "vomiting", "yellowish skin", "nausea", "loss of appetite", "abdominal pain", "yellowing of eyes"] },
  { disease: "Drug reaction", symptoms: ["skin rash", "nodal skin eruptions", "itching", "stomach pain", "burning micturition", "spotting urination"] },
  { disease: "Peptic ulcer disease", symptoms: ["vomiting", "indigestion", "loss of appetite", "abdominal pain", "passage of gases", "internal itching"] },
  { disease: "Diabetes", symptoms: ["fatigue", "weight loss", "restlessness", "lethargy", "irregular sugar level", "blurred and distorted vision", "increased appetite", "polyuria"] },
  { disease: "Gastroenteritis", symptoms: ["vomiting", "diarrhea", "nausea", "sunken eyes", "dehydration"] },
  { disease: "Bronchial asthma", symptoms: ["fatigue", "cough", "high fever", "breathlessness"] },
  { disease: "Hypertension", symptoms: ["headache", "chest pain", "dizziness", "loss of balance", "lack of concentration"] },
  { disease: "Migraine", symptoms: ["acidity", "indigestion", "headache", "blurred and distorted vision", "excessive hunger", "stiff neck", "depression", "irritability", "visual disturbances"] },
  { disease: "Cervical spondylosis", symptoms: ["back pain", "weakness in limbs", "neck pain", "dizziness", "loss of balance"] },
  { disease: "Paroxysmal positional vertigo", symptoms: ["vomiting", "headache", "nausea", "spinning movements", "loss of balance", "unsteadiness"] },
  { disease: "Jaundice", symptoms: ["itching", "vomiting", "fatigue", "weight loss", "high fever", "yellowish skin", "dark urine", "yellowing of eyes", "acute liver failure", "swelling of stomach"] },
  { disease: "Malaria", symptoms: ["chills", "vomiting", "high fever", "sweating", "headache", "nausea", "diarrhea"] },
  { disease: "Chicken pox", symptoms: ["itching", "skin rash", "fatigue", "lethargy", "high fever", "headache", "loss of appetite", "mild fever", "swollen lymph nodes", "malaise", "red spots over body"] },
  { disease: "Dengue", symptoms: ["skin rash", "chills", "joint pain", "vomiting", "fatigue", "high fever", "headache", "nausea", "loss of appetite", "pain behind eyes", "back pain", "muscle pain", "red spots over body"] },
  { disease: "Typhoid", symptoms: ["chills", "vomiting", "fatigue", "high fever", "headache", "nausea", "constipation", "abdominal pain", "diarrhea", "toxic look", "stomach pain", "belly pain"] },
  { disease: "Hepatitis A", symptoms: ["joint pain", "vomiting", "yellowish skin", "dark urine", "nausea", "loss of appetite", "diarrhea", "mild fever", "yellowing of eyes", "muscle pain"] },
  { disease: "Tuberculosis", symptoms: ["chills", "vomiting", "fatigue", "weight loss", "cough", "high fever", "breathlessness", "sweating", "loss of appetite", "mild fever", "chest pain", "blood in sputum"] },
  { disease: "Common cold", symptoms: ["continuous sneezing", "chills", "fatigue", "cough", "high fever", "headache", "swollen lymph nodes", "malaise", "phlegm", "throat irritation", "redness of eyes", "sinus pressure", "runny nose", "congestion", "chest pain"] },
  { disease: "Pneumonia", symptoms: ["chills", "fatigue", "cough", "high fever", "breathlessness", "sweating", "mild fever", "chest pain", "blood in sputum", "rusty sputum"] },
  { disease: "Urinary tract infection", symptoms: ["burning micturition", "bladder discomfort", "foul smell of urine", "continuous feel of urine"] },
  { disease: "Psoriasis", symptoms: ["skin rash", "joint pain", "skin peeling", "silver like dusting", "small dents in nails", "inflammatory nails"] },
  { disease: "Osteoarthritis", symptoms: ["joint pain", "neck pain", "knee pain", "hip joint pain", "swelling joints", "painful walking"] },
  { disease: "Hypothyroidism", symptoms: ["fatigue", "weight gain", "cold hands and feet", "mood swings", "lethargy", "dizziness", "puffy face and eyes", "swollen extremities", "depression", "brittle nails", "swollen legs"] },
  { disease: "Hyperthyroidism", symptoms: ["fatigue", "mood swings", "weight loss", "restlessness", "sweating", "diarrhea", "enlarged thyroid", "palpitations", "irritability", "muscle weakness"] },
  { disease: "Hypoglycemia", symptoms: ["vomiting", "fatigue", "anxiety", "sweating", "headache", "nausea", "blurred and distorted vision", "excessive hunger", "slurred speech", "irritability", "palpitations"] },
  { disease: "Acne", symptoms: ["skin rash", "pus filled pimples", "blackheads", "scurrying"] },
  { disease: "Impetigo", symptoms: ["skin rash", "high fever", "blister", "red sore around nose", "yellow crust ooze"] },
];

/** Console symptom id → real dataset symptom name (null = no real counterpart). */
export const CONSOLE_TO_VOCAB: Record<string, string | null> = {
  fever: "high fever",
  cough: "cough",
  headache: "headache",
  fatigue: "fatigue",
  chills: "chills",
  sore_throat: "throat irritation",
  runny_nose: "runny nose",
  sneezing: "continuous sneezing",
  shortness_breath: "breathlessness",
  loss_taste: null,
  dizziness: "dizziness",
  nausea: "nausea",
  vomiting: "vomiting",
  diarrhea: "diarrhea",
  abdominal_pain: "abdominal pain",
  rash: "skin rash",
  itching: "itching",
  muscle_aches: "muscle pain",
  joint_pain: "joint pain",
  chest_pain: "chest pain",
  burning_urination: "burning micturition",
  frequent_urination: "continuous feel of urine",
  night_sweats: "sweating",
  weight_loss: "weight loss",
};

/** The real, citable datasets each console head would train on in production. */
export const REAL_DATASETS = [
  {
    name: "Chest X-Ray (Pneumonia)",
    size: "5,856 radiographs",
    classes: "Normal / Pneumonia",
    url: "https://www.kaggle.com/datasets/paultimothymooney/chest-xray-pneumonia",
    head: "RADIOLOGY",
  },
  {
    name: "HAM10000",
    size: "10,015 dermoscopies",
    classes: "7 lesion classes",
    url: "https://www.kaggle.com/datasets/kmader/skin-cancer-mnist-ham10000",
    head: "DERM SCAN",
  },
  {
    name: "ISIC 2019",
    size: "33,126 dermoscopies",
    classes: "8 lesion classes",
    url: "https://challenge.isic-archive.com/data/",
    head: "DERM SCAN",
  },
  {
    name: "Disease-Symptom Prediction",
    size: "3,900 patient rows",
    classes: "36 diseases · 132 symptoms",
    url: DATASET_SOURCE.url,
    head: "SYMPTOM ENCODER",
  },
];
