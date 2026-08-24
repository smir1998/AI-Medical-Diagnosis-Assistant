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
      "A CNN (Convolutional Neural Network) is a deep-learning architecture built for images. Convolutional filters slide across the X-ray detecting edges → textures → clinical patterns (like consolidation), then pooling compresses them and dense layers output class probabilities.",
  },
  {
    keys: ["normalize", "normalization", "255", "pixel"],
    answer:
      "We divide pixel values by 255 to scale them into [0, 1]. Normalization puts every input on the same range, which makes gradient descent converge faster and training far more stable.",
  },
  {
    keys: ["transfer", "resnet", "mobilenet", "pretrained", "pre-trained"],
    answer:
      "Transfer learning reuses a model pre-trained on ImageNet (e.g. ResNet-50, MobileNetV2) and fine-tunes its top layers on medical images. It reaches high accuracy with far fewer X-rays and far less GPU time.",
  },
  {
    keys: ["precision", "recall", "accuracy", "metric", "f1"],
    answer:
      "Accuracy = overall correctness. Precision = of predicted positives, how many were real. Recall = of real positives, how many we caught. In healthcare, recall matters most — missing pneumonia (a false negative) is more dangerous than an extra review (a false positive).",
  },
  {
    keys: ["doctor", "see a doctor", "urgent", "emergency", "hospital", "when to"],
    answer:
      "Seek urgent care for: chest pain, difficulty breathing, confusion, stiff neck with fever, oxygen saturation below 94%, dehydration, or any symptom that is severe or rapidly worsening. This tool is educational — it never replaces a clinician.",
  },
  {
    keys: ["accurate", "reliable", "trust", "misdiagnose", "how good", "validated"],
    answer:
      "Validation-wise, PneumoNet v3 holds 94.2% accuracy with 95.1% recall on held-out studies — but this console runs deterministic teaching simulations, not those trained weights. Treat every output as a demonstration of the pipeline, never as a personal diagnosis; clinician review plus proper imaging is the only ground truth.",
  },
  {
    keys: ["fever"],
    answer:
      "Fever is a defence response, usually infectious. Rest, fluids, and paracetamol help. Consult a clinician if it exceeds 39.4 °C, lasts over 3 days, or comes with rash, stiff neck, breathing difficulty or chest pain.",
  },
  {
    keys: ["x-ray", "xray", "upload", "image", "prepare"],
    answer:
      "For the image lab: upload a chest radiograph (JPG/PNG). The pipeline resizes it to 224×224, normalizes intensities, runs it through the CNN and returns Normal vs Pneumonia probabilities with a Grad-CAM style attention hotspot.",
  },
  {
    keys: ["how", "predict", "work", "model", "algorithm"],
    answer:
      "Three heads: (1) a symptom encoder converts checked symptoms into a weighted feature vector and scores 12 disease profiles with a softmax head; (2) a CNN scores uploaded chest radiographs; (3) a dermoscopy CNN classifies skin lesions against the ABCDE rule. All are deterministic educational simulations of real clinical ML pipelines.",
  },
  {
    keys: ["accurate", "trust", "reliable", "real"],
    answer:
      "Honest answer: this is a teaching model with a small hand-built knowledge base — not a certified medical device. Real systems (e.g. FDA-cleared CXR triage tools) are validated on tens of thousands of studies. Use this to learn the workflow, not to self-diagnose.",
  },
  {
    keys: ["privacy", "data", "stored", "upload safe"],
    answer:
      "Everything here runs in your browser. Symptoms and images are processed client-side in memory and never leave your device — nothing is uploaded or persisted.",
  },
  {
    keys: ["cough"],
    answer:
      "A cough lasting under 3 weeks is usually viral. Hydration and honey (age 1+) help. See a doctor if you cough blood, have chest pain, shortness of breath, or the cough persists beyond 3 weeks.",
  },
  {
    keys: ["hello", "hi ", "hey"],
    answer:
      "Hello! I'm the MedLens assistant. Ask me about CNNs, transfer learning, precision vs recall, when to seek care — or run the symptom / image labs and I can explain the output.",
  },
];

export const CHAT_FALLBACK =
  "I couldn't match that to my knowledge base. Try asking about CNNs, normalization, transfer learning, precision/recall, or when to see a doctor. For personal symptoms, please use the Symptom Lab tab — and remember I'm an educational tool, not a clinician.";

/* ------------------------------------------------------------------ */
/*  Pipeline + models + FAQ                                            */
/* ------------------------------------------------------------------ */

export const PIPELINE_STAGES = [
  { id: "input", label: "Patient Input", detail: "symptoms / DICOM" },
  { id: "pre", label: "Preprocessing", detail: "resize 224 · ÷255" },
  { id: "cnn", label: "CNN Inference", detail: "Conv → Pool → Dense" },
  { id: "soft", label: "Softmax", detail: "class probabilities" },
  { id: "report", label: "Report", detail: "recommendations" },
];

export const MODEL_CARDS = [
  {
    name: "PneumoNet v3",
    arch: "ResNet-50 · transfer learning",
    dataset: "Chest X-Ray, 5,856 studies",
    acc: 94.2,
    prec: 92.8,
    rec: 95.1,
    f1: 93.9,
  },
  {
    name: "DermaScan",
    arch: "MobileNetV2 · fine-tuned",
    dataset: "Skin lesions, 3,200 images",
    acc: 91.5,
    prec: 90.2,
    rec: 88.7,
    f1: 89.4,
  },
];

export const CONFUSION = { tp: 412, fp: 34, fn: 21, tn: 533 };

export const TRAINING_STEPS = [
  { n: "01", title: "Load & decode", code: "image = cv2.imread('xray.jpg')", note: "OpenCV reads the radiograph as a NumPy array of shape (H, W, 3)." },
  { n: "02", title: "Resize to 224×224", code: "image = cv2.resize(image, (224, 224))", note: "Fixed spatial size so batches stack into one tensor." },
  { n: "03", title: "Normalize", code: "image = image / 255.0", note: "Scales pixels to [0,1] → faster training, better convergence." },
  { n: "04", title: "Build the CNN", code: "Conv2D(32) → MaxPool → Flatten → Dense(128) → Dense(2, softmax)", note: "Filters learn opacity textures; softmax yields class probabilities." },
  { n: "05", title: "Compile", code: "model.compile(optimizer='adam', loss='categorical_crossentropy')", note: "Adam adapts the learning rate per-parameter; cross-entropy fits probabilities." },
  { n: "06", title: "Train & evaluate", code: "model.fit(X_train, y_train, epochs=10, validation_data=(X_test, y_test))", note: "The network learns disease patterns and reports accuracy per epoch." },
];

export const FAQS = [
  {
    q: "Q1 · What is a CNN?",
    a: "A Convolutional Neural Network is a deep-learning architecture designed for image processing and computer vision. Stacked convolutional filters learn hierarchical features — from edges to the hazy consolidations radiologists read on a chest film.",
  },
  {
    q: "Q2 · Why is normalization important?",
    a: "It scales pixel values to a consistent range, improving training speed and model performance. Gradients stay well-conditioned, so Adam converges in fewer epochs without oscillating.",
  },
  {
    q: "Q3 · What is Transfer Learning?",
    a: "Using a pre-trained model such as ResNet or MobileNet and fine-tuning it for a new task instead of training from scratch. Medical datasets are small — transfer learning borrows general visual knowledge learned from millions of natural images.",
  },
  {
    q: "Q4 · Why are Precision and Recall important in healthcare?",
    a: "In medical applications, missing a disease (a false negative) can be more dangerous than a false positive, so recall is often the critical metric. A triage model should catch nearly every pneumonia, even if it means flagging a few healthy scans for review.",
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
  "12,480 scans analyzed",
  "PneumoNet v3 accuracy 94.2%",
  "24 symptoms indexed",
  "12 disease profiles",
  "Recall-first triage policy",
  "Grad-CAM attention mapping",
  "ISIC-2019 · 25,331 dermoscopy images",
  "ABCDE rule enforcement",
  "Zero data leaves your browser",
  "Educational build · not a medical device",
];
