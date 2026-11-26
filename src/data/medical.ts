/* ------------------------------------------------------------------ */
/*  MedLens knowledge base — educational, deterministic toy models     */
/* ------------------------------------------------------------------ */

export interface Symptom {
  id: string;
  label: string;
  group: string;
}

export const SYMPTOM_GROUPS = [
  "General",
  "Respiratory",
  "Neurological",
  "Gastrointestinal",
  "Skin",
  "Pain",
  "Urinary",
] as const;

export const SYMPTOMS: Symptom[] = [
  { id: "fever", label: "Fever", group: "General" },
  { id: "chills", label: "Chills", group: "General" },
  { id: "fatigue", label: "Fatigue", group: "General" },
  { id: "night_sweats", label: "Night sweats", group: "General" },
  { id: "weight_loss", label: "Unexplained weight loss", group: "General" },
  { id: "cough", label: "Cough", group: "Respiratory" },
  { id: "sore_throat", label: "Sore throat", group: "Respiratory" },
  { id: "runny_nose", label: "Runny nose", group: "Respiratory" },
  { id: "sneezing", label: "Sneezing", group: "Respiratory" },
  { id: "shortness_breath", label: "Shortness of breath", group: "Respiratory" },
  { id: "loss_taste", label: "Loss of taste / smell", group: "Respiratory" },
  { id: "headache", label: "Headache", group: "Neurological" },
  { id: "dizziness", label: "Dizziness", group: "Neurological" },
  { id: "nausea", label: "Nausea", group: "Gastrointestinal" },
  { id: "vomiting", label: "Vomiting", group: "Gastrointestinal" },
  { id: "diarrhea", label: "Diarrhea", group: "Gastrointestinal" },
  { id: "abdominal_pain", label: "Abdominal pain", group: "Gastrointestinal" },
  { id: "rash", label: "Skin rash", group: "Skin" },
  { id: "itching", label: "Itching", group: "Skin" },
  { id: "muscle_aches", label: "Muscle aches", group: "Pain" },
  { id: "joint_pain", label: "Joint pain", group: "Pain" },
  { id: "chest_pain", label: "Chest pain", group: "Pain" },
  { id: "burning_urination", label: "Burning urination", group: "Urinary" },
  { id: "frequent_urination", label: "Frequent urination", group: "Urinary" },
];

export interface Disease {
  id: string;
  name: string;
  code: string;
  severity: "Low" | "Moderate" | "High";
  specialty: string;
  base: number;
  weights: Record<string, number>;
  recs: string[];
  blurb: string;
}

export const DISEASES: Disease[] = [
  {
    id: "influenza",
    name: "Influenza (Flu)",
    code: "J11.1",
    severity: "Moderate",
    specialty: "General Medicine",
    base: 1.0,
    weights: { fever: 3.0, cough: 2.3, chills: 2.3, muscle_aches: 2.5, fatigue: 2.2, headache: 1.6, sore_throat: 1.3 },
    recs: ["Rest and hydrate; monitor temperature twice daily.", "Antivirals are most effective within 48h of onset — consult a physician.", "Isolate at home until fever-free for 24h."],
    blurb: "Acute viral respiratory infection with sudden onset of systemic symptoms.",
  },
  {
    id: "covid19",
    name: "COVID-19",
    code: "U07.1",
    severity: "Moderate",
    specialty: "Infectious Disease",
    base: 0.8,
    weights: { fever: 2.6, cough: 2.6, loss_taste: 3.4, fatigue: 2.0, shortness_breath: 2.3, sore_throat: 1.4, headache: 1.2, muscle_aches: 1.4 },
    recs: ["Take a rapid antigen / PCR test to confirm.", "Isolate per local guidance; mask around others.", "Seek care immediately if breathing difficulty develops."],
    blurb: "SARS-CoV-2 infection; anosmia (loss of smell) is a strong discriminating feature.",
  },
  {
    id: "common_cold",
    name: "Common Cold",
    code: "J00",
    severity: "Low",
    specialty: "General Medicine",
    base: 1.2,
    weights: { runny_nose: 3.0, sneezing: 2.7, sore_throat: 2.0, cough: 1.5, headache: 0.8, fatigue: 0.8 },
    recs: ["Symptomatic relief: fluids, saline rinse, rest.", "Usually self-limiting within 7–10 days.", "See a doctor if symptoms persist beyond 10 days."],
    blurb: "Mild upper-respiratory viral infection, predominantly nasal symptoms.",
  },
  {
    id: "migraine",
    name: "Migraine",
    code: "G43.9",
    severity: "Moderate",
    specialty: "Neurology",
    base: 0.6,
    weights: { headache: 4.0, nausea: 1.9, dizziness: 1.7, fatigue: 0.9 },
    recs: ["Rest in a dark, quiet room at onset.", "Track triggers (sleep, diet, stress) in a headache diary.", "A neurologist can prescribe triptans for acute attacks."],
    blurb: "Recurrent moderate-to-severe headache, often with nausea and light sensitivity.",
  },
  {
    id: "tension_headache",
    name: "Tension Headache",
    code: "G44.2",
    severity: "Low",
    specialty: "General Medicine",
    base: 0.9,
    weights: { headache: 2.9, fatigue: 1.2, dizziness: 0.6 },
    recs: ["Hydration, posture breaks and gentle neck stretches.", "OTC analgesics sparingly (≤2 days/week).", "Persistent daily headaches warrant medical review."],
    blurb: "Bilateral pressing headache, the most common primary headache type.",
  },
  {
    id: "pneumonia",
    name: "Pneumonia",
    code: "J18.9",
    severity: "High",
    specialty: "Pulmonology",
    base: 0.5,
    weights: { cough: 3.0, fever: 2.6, shortness_breath: 3.3, chest_pain: 2.1, chills: 2.0, fatigue: 1.6 },
    recs: ["Chest X-ray confirmation is strongly advised.", "Do not delay — bacterial pneumonia needs antibiotics.", "Monitor oxygen saturation if a pulse oximeter is available."],
    blurb: "Infection of the lung air sacs; classically visible as consolidation on X-ray.",
  },
  {
    id: "gastroenteritis",
    name: "Acute Gastroenteritis",
    code: "K52.9",
    severity: "Moderate",
    specialty: "Gastroenterology",
    base: 0.7,
    weights: { diarrhea: 3.4, vomiting: 2.6, nausea: 2.6, abdominal_pain: 2.8, fever: 1.0 },
    recs: ["Prioritise oral rehydration salts (ORS), small frequent sips.", "Bland diet as tolerated; avoid dairy temporarily.", "Blood in stool or signs of dehydration need urgent care."],
    blurb: "Inflammation of the gut, usually viral; dehydration is the main risk.",
  },
  {
    id: "dengue",
    name: "Dengue Fever",
    code: "A90",
    severity: "High",
    specialty: "Infectious Disease",
    base: 0.3,
    weights: { fever: 3.4, rash: 2.4, joint_pain: 2.7, muscle_aches: 2.4, headache: 1.8, nausea: 1.2 },
    recs: ["NSAIDs (ibuprofen/aspirin) are contraindicated — use paracetamol only.", "Full blood count to monitor platelets.", "Endemic-area travel history raises suspicion significantly."],
    blurb: "Mosquito-borne 'breakbone fever'; watch for warning signs after defervescence.",
  },
  {
    id: "allergic_rhinitis",
    name: "Allergic Rhinitis",
    code: "J30.4",
    severity: "Low",
    specialty: "Allergy / Immunology",
    base: 0.9,
    weights: { sneezing: 3.2, runny_nose: 3.0, itching: 2.3, cough: 0.7 },
    recs: ["Identify and reduce allergen exposure (pollen, dust mites).", "Non-drowsy antihistamines provide first-line relief.", "Intranasal corticosteroids for persistent symptoms."],
    blurb: "IgE-mediated nasal inflammation; itchy eyes/nose distinguish it from infection.",
  },
  {
    id: "strep_throat",
    name: "Streptococcal Pharyngitis",
    code: "J03.0",
    severity: "Moderate",
    specialty: "General Medicine",
    base: 0.5,
    weights: { sore_throat: 3.6, fever: 2.2, headache: 1.0, rash: 0.9, cough: -1.2 },
    recs: ["Rapid strep test / throat culture confirms diagnosis.", "Complete the full antibiotic course if prescribed.", "Replace toothbrush 24h after starting antibiotics."],
    blurb: "Bacterial throat infection; absence of cough raises likelihood (Centor criteria).",
  },
  {
    id: "uti",
    name: "Urinary Tract Infection",
    code: "N39.0",
    severity: "Moderate",
    specialty: "Urology",
    base: 0.4,
    weights: { burning_urination: 3.8, frequent_urination: 3.2, abdominal_pain: 1.3, fever: 0.9 },
    recs: ["Urine dipstick / culture guides antibiotic choice.", "Fever plus back pain suggests kidney involvement — urgent care.", "Hydration helps; do not postpone urination."],
    blurb: "Bacterial infection of the urinary tract; dysuria is the hallmark symptom.",
  },
  {
    id: "anemia",
    name: "Iron-Deficiency Anemia",
    code: "D50.9",
    severity: "Moderate",
    specialty: "Hematology",
    base: 0.4,
    weights: { fatigue: 3.1, dizziness: 2.1, headache: 1.2, shortness_breath: 1.3, weight_loss: 0.8 },
    recs: ["CBC + ferritin blood test confirms diagnosis.", "Iron-rich diet; supplements only under medical advice.", "Investigate underlying cause (especially in adults)."],
    blurb: "Reduced oxygen-carrying capacity causing persistent fatigue and pallor.",
  },
];

/* symptoms that alone, or in combination, raise an urgent-care flag */
export const RED_FLAG_SINGLE = ["chest_pain", "shortness_breath", "night_sweats", "weight_loss"];
export const RED_FLAG_COMBOS: { ids: string[]; note: string }[] = [
  { ids: ["chest_pain", "shortness_breath"], note: "Chest pain with breathlessness can indicate a cardiac or pulmonary emergency." },
  { ids: ["fever", "rash"], note: "Fever with a new rash can indicate meningococcal disease or dengue." },
  { ids: ["fever", "headache", "vomiting"], note: "This triad warrants ruling out meningitis promptly." },
];

export const DURATIONS = ["< 24 hours", "1–3 days", "4–7 days", "> 1 week"];

/* ------------------------------------------------------------------ */
/*  NLP knowledge base (keyword → answer)                              */
/* ------------------------------------------------------------------ */

export interface ChatEntry {
  keys: string[];
  answer: string;
}

export const CHAT_KB: ChatEntry[] = [
  {
    keys: ["cnn", "convolutional", "convolution"],
    answer:
      "A convolutional neural network (CNN) learns spatial image patterns through convolution filters and pooling. The Radiology Lab runs a pretrained ConvNeXt-Tiny model for research and education that estimates pneumonia score from frontal chest X-rays; it is not validated for patient care.",
  },
  {
    keys: ["normalize", "normalization", "255", "pixel"],
    answer:
      "Image normalization often rescales pixel values, for example from [0, 255] to [0, 1], before model inference. The radiology model converts the image to grayscale, resizes it, and scales pixels to [0, 1] as its training pipeline requires.",
  },
  {
    keys: ["transfer", "resnet", "mobilenet", "pretrained", "pre-trained"],
    answer:
      "Transfer learning starts from a model trained on one dataset and adapts it to another task. Whether it improves performance depends on the source and target data, training method, and evaluation design. This app does not perform transfer learning.",
  },
  {
    keys: ["precision", "recall", "accuracy", "metric", "f1"],
    answer:
      "Accuracy is the share of all predictions that are correct; precision is the share of positive predictions that are correct; recall is the share of actual positives detected. Which metric matters most depends on the intended use, harms, and operating threshold. The metrics in Training Grounds describe only its held-out dataset split.",
  },
  {
    keys: ["accurate", "reliable", "trust", "validated", "how good", "limits"],
    answer:
      "This is an educational demonstration, not a medical device or a clinically validated system. Symptom scores use hand-weighted example profiles; the radiology model is research-only and has limited external validation; and Training Grounds evaluates a separate model on a bundled teaching dataset. None of these results is a diagnosis or evidence of clinical performance for this app.",
  },
  {
    keys: ["doctor", "see a doctor", "urgent", "emergency", "hospital", "when to"],
    answer:
      "This educational app cannot assess urgency. If you think you may be having an emergency or symptoms are severe or rapidly worsening, contact your local emergency service or a qualified clinician now.",
  },
  {
    keys: ["fever"],
    answer:
      "Fever can have many causes, and what to do depends on age, health, and other symptoms. This app cannot provide personal treatment advice. Contact a qualified clinician if you are concerned, and use local emergency services for severe or rapidly worsening symptoms.",
  },
  {
    keys: ["x-ray", "xray", "upload", "image", "prepare"],
    answer:
      "The Radiology Lab runs a research-only pretrained model that estimates pneumonia score on uploaded frontal chest X-rays and shows Grad-CAM activation. It does not diagnose patients; it does not cover other diseases or image types; and model performance varies across hospitals, age groups, and views.",
  },
  {
    keys: ["how does", "how it works", "work", "architecture", "pipeline"],
    answer:
      "The active app has a patient list, a hand-weighted symptom scoring demo, a research-only pneumonia model for frontal chest X-rays, a keyword-based educational chatbot, a report view, a model reference list, and a separate SGD training sandbox. The sandbox trains on bundled symptom rows but does not power the Symptom Lab. The image model runs locally in the browser and its score is not a diagnosis.",
  },
  {
    keys: ["deploy", "streamlit", "fastapi", "render", "railway"],
    answer:
      "The curriculum path is Streamlit or FastAPI for a Python model server, deployed on Render, Railway or Hugging Face Spaces. This console is the same architecture shipped as a static React SPA on GitHub Pages — inference runs entirely in your browser.",
  },
  {
    keys: ["hugging", "hf", "which model", "model zoo", "biomed", "pubmedbert", "meditron", "registry"],
    answer:
      "Model Registry contains links to external model projects for reference. Those projects and their published metrics are not integrated into this app and do not validate its outputs. The only trained model in the app is the standalone dataset-training sandbox.",
  },
];

export const CHAT_FALLBACK =
  "I couldn't match that question. I can explain this demo's features and general machine-learning terms, but I can't assess symptoms or give personal medical advice. For health concerns, contact a qualified clinician; for emergencies, contact local emergency services.";

/* ------------------------------------------------------------------ */
/*  Pipeline + models + FAQ                                            */
/* ------------------------------------------------------------------ */

export const PIPELINE_STAGES = [
  { id: "input", label: "Example Input", detail: "selected symptoms" },
  { id: "pre", label: "Profile Matching", detail: "hand-weighted features" },
  { id: "cnn", label: "Relative Scoring", detail: "built-in teaching profiles" },
  { id: "soft", label: "Score Display", detail: "not probabilities" },
  { id: "report", label: "Educational Summary", detail: "not medical advice" },
];

export const HF_MODEL_ZOO = [
  {
    repoId: "mdsajjadullah/chest-xray-pneumonia-resnet50",
    name: "Chest X-Ray Pneumonia ResNet-50",
    arch: "ResNet-50 · transfer learning",
    dataset: "Chest X-Ray (Pneumonia) — 5,216 images",
    acc: 91.83,
    prec: 98.21,
    rec: 98.21,
    f1: 93.76,
    tag: "vision",
    role: "Radiology Lab",
    params: "25.6M",
    metric: "91.83% accuracy · 96.50% ROC-AUC",
  },
  {
    repoId: "syaha/skin_cancer_detection_model",
    name: "Skin Cancer Detection",
    arch: "CNN · TensorFlow/Keras",
    dataset: "HAM10000 · 10,015 dermoscopy images, 7 classes",
    acc: 73.0,
    prec: 73.0,
    rec: 73.0,
    f1: 73.0,
    tag: "vision",
    role: "Derm Scan",
    params: "~5M",
    metric: "73% accuracy on HAM10000",
  },
  {
    repoId: "microsoft/BiomedNLP-BiomedBERT-base-uncased-abstract-fulltext",
    name: "BiomedBERT (PubMedBERT)",
    arch: "BERT-base · domain pretraining from scratch",
    dataset: "PubMed abstracts + PubMed Central full-text",
    acc: 82.91,
    prec: 82.91,
    rec: 82.91,
    f1: 82.91,
    tag: "nlp",
    role: "Symptom Lab",
    params: "110M",
    metric: "82.91 BLURB benchmark (state-of-the-art)",
  },
  {
    repoId: "epfl-llm/meditron-7b",
    name: "Meditron-7B",
    arch: "Llama-2-7B · continued pretraining",
    dataset: "48.1B tokens · PubMed + clinical guidelines",
    acc: 57.5,
    prec: 57.5,
    rec: 57.5,
    f1: 57.5,
    tag: "llm",
    role: "NLP Desk",
    params: "7B",
    metric: "57.5% avg · 74.4% PubMedQA · 59.2% MedMCQA",
  },
  {
    repoId: "microsoft/BiomedCLIP-PubMedBERT_256-vit_base_patch16_224",
    name: "BiomedCLIP",
    arch: "ViT-B/16 + PubMedBERT · multimodal",
    dataset: "PMC-15M · 15M biomedical image–text pairs",
    acc: 78.95,
    prec: 78.95,
    rec: 78.95,
    f1: 78.95,
    tag: "multimodal",
    role: "Both vision heads",
    params: "196M",
    metric: "78.95% RSNA Pneumonia · 75.8% VQA-RAD",
  },
];

export const TRAINING_STEPS = [
  {
    n: "01",
    title: "Load & decode",
    code: 'image = cv2.imread("xray.jpg")',
    note: "OpenCV reads BGR channels; medical pipelines usually convert to grayscale or RGB before anything else.",
  },
  {
    n: "02",
    title: "Resize to the model's eye",
    code: "image = cv2.resize(image, (224, 224))",
    note: "The network expects a fixed tensor — every study, whatever its original size, becomes 224×224.",
  },
  {
    n: "03",
    title: "Normalize intensities",
    code: "image = image / 255.0",
    note: "Scales pixels to [0, 1]. Well-conditioned inputs ⇒ well-behaved gradients ⇒ faster, steadier convergence.",
  },
  {
    n: "04",
    title: "Build the CNN",
    code: 'Conv2D(32, (3,3), activation="relu") + MaxPooling2D((2,2))',
    note: "Convolutions learn edge → texture → clinical-pattern detectors; pooling compresses spatial dimensions.",
  },
  {
    n: "05",
    title: "Compile & train",
    code: 'model.compile(optimizer="adam", loss="categorical_crossentropy")',
    note: "Adam adapts the learning rate per weight; cross-entropy punishes confident wrong predictions hardest.",
  },
  {
    n: "06",
    title: "Predict with probabilities",
    code: "model.predict(image)  # → Pneumonia: 92%, Normal: 8%",
    note: "The softmax head turns logits into a probability distribution the report can quote honestly.",
  },
];

export const CONFUSION = { tp: 286, fp: 21, fn: 12, tn: 681 };

export const FAQS = [
  {
    q: "What is a CNN?",
    a: "A Convolutional Neural Network is a deep learning architecture designed for image processing and computer vision. Stacked convolutional filters learn hierarchical features — edges, then textures, then disease patterns like consolidation — and a dense head maps them to class probabilities.",
  },
  {
    q: "Why is normalization important?",
    a: "It scales pixel values to a consistent range (÷255 → [0,1]), which improves training speed and model performance: gradients stay well-conditioned, so the optimizer converges in fewer epochs and is less sensitive to the learning rate.",
  },
  {
    q: "What is Transfer Learning?",
    a: "Using a pre-trained model such as ResNet or MobileNet and fine-tuning it for a new task instead of training from scratch. The lower layers already know generic visual features, so medical models reach high accuracy with far fewer labelled scans.",
  },
  {
    q: "Why are Precision and Recall important in healthcare?",
    a: "In medical applications, missing a disease (false negative) can be more dangerous than a false positive, so recall is often the critical metric. A triage model is tuned to catch nearly every pneumonia even if it means extra reviews for healthy scans.",
  },
];

export const SAMPLE_DATASET = [
  { fever: 1, cough: 1, headache: 0, disease: "Flu" },
  { fever: 1, cough: 1, headache: 1, disease: "COVID-19" },
  { fever: 0, cough: 0, headache: 1, disease: "Migraine" },
  { fever: 1, cough: 1, headache: 0, disease: "Pneumonia" },
  { fever: 0, cough: 1, headache: 0, disease: "Common Cold" },
  { fever: 1, cough: 0, headache: 1, disease: "Dengue" },
];

export const SAMPLE_XRAY_PNEUMONIA =
  "https://image.qwenlm.ai/generated-images/c9aee7f6-2b13-45d5-a7bf-7f769697cf51/_result.png";
export const SAMPLE_XRAY_NORMAL =
  "https://image.qwenlm.ai/generated-images/12db6a24-0b22-469e-bbf6-94d7bb1eec08/_result.png";

export const TICKER_ITEMS = [
  "Educational demonstration only",
  "External model links are references",
  "Image lab measures pixel statistics",
  "Symptom scoring uses example profiles",
  "No clinical validation",
  "Patient records are held in app memory",
  "Training sandbox uses bundled dataset rows",
  "Symptom scores are not probabilities",
  "Educational build · not clinically validated",
];
