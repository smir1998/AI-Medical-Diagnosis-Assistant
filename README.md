# MedLens·AI — Medical Diagnosis Assistant

> **Deep Learning in Health Care** — an AI triage workstation combining a symptom encoder, a chest
> X-ray CNN, a dermoscopy classifier and a medical NLP desk into one decision-support console.

[![Live on GitHub Pages](https://img.shields.io/badge/LIVE-GitHub%20Pages-0e7c72)](https://smir1998.github.io/AI-Medical-Diagnosis-Assistant/)
[![QA Bench](https://img.shields.io/badge/QA-38%20cases%20in--browser-16241f)](https://smir1998.github.io/AI-Medical-Diagnosis-Assistant/)
[![License: MIT](https://img.shields.io/badge/License-MIT-a16207.svg)](LICENSE)

⚠️ **Educational simulation only.** MedLens is a learning tool — its predictions are deterministic
toy-model outputs, not clinical diagnoses. Never use it as a substitute for professional medical advice.

![MedLens console](https://image.qwenlm.ai/generated-images/597b72cb-81ed-4bdb-8a36-76013216f5ee/_result.png)

---

## What's inside

| Module | Technique | What it does |
| --- | --- | --- |
| **Registrar** | On-device admission log (localStorage) | Intake form (name, age, sex, chief complaint, allergies, CTAS triage 1–5, HR/BP/SpO₂/temp vitals), auto-issued MRNs, clinical flag engine (hypoxia, tachycardia, febrile…), CSV export, chart/discharge workflow — the active patient is stamped onto every report and its CC pre-fills the symptom vector |
| **Symptom Lab** | NLP-encoded feature vector → softmax over 12 disease profiles | Differential diagnosis with confidence, ICD-10 codes, severity tiers, red-flag rules |
| **Radiology Lab** | Simulated CNN (Conv→Pool→Dense→softmax) with Grad-CAM-style hotspot | Pneumonia vs Normal classification on uploaded or sample chest X-rays |
| **Derm Scan** | CLAHE → Otsu ROI → 3-class EfficientNet-style head + ABCDE rule engine | Benign / atypical / melanoma-pattern screening with pixel-statistics heuristic |
| **NLP Desk** | Keyword-weighted medical Q&A | Answers CNN / normalization / transfer-learning / precision-recall questions |
| **Report Engine** | Multi-modal report compilation | Printable patient analysis report (Print → PDF), referral recommendations |
| **Training Grounds** | Live SGD trainer on the real [Disease-Symptom dataset](https://www.kaggle.com/datasets/itachi9604/disease-symptom-description-dataset) | Trains a multinomial logistic head in-browser on real disease–symptom associations; accuracy/precision/recall/F1 are **measured on a held-out split**, not invented — with a live loss curve and inference from the trained weights |
| **QA Bench** | 38-case in-browser regression suite | Tests the live engine: NB posterior invariants, priors/likelihoods from data, red-flag rules, determinism, pixel-head monotonicity, live-trainer convergence & measured accuracy, registrar validation, vitals flags, CSV export, HF model-registry integrity, semantic-engine math |
| **Model Registry** | Verified Hugging Face Hub lineage | Production model for every head (below), linked to live model pages |

## Model lineage (Hugging Face Hub)

The console runs deterministic teaching heads; these are the real models a clinical deployment would load:

| Console head | HF model | Architecture | Trained on |
| --- | --- | --- | --- |
| Radiology Lab | [`keremberke/resnet-50-chest-xray-classification`](https://huggingface.co/keremberke/resnet-50-chest-xray-classification) | ResNet-50 (25.6M) | Kaggle Chest X-Ray · 5,824 radiographs |
| Derm Scan | [`syaha/skin_cancer_detection_model`](https://huggingface.co/syaha/skin_cancer_detection_model) | CNN · HAM10000 fine-tuned | HAM10000 · 10,015 dermoscopy lesions, 7 classes |
| Symptom Lab | [`microsoft/BiomedNLP-PubMedBERT`](https://huggingface.co/microsoft/BiomedNLP-PubMedBERT-base-uncased-abstract-fulltext) | PubMedBERT-base (110M) | 3.1B words of PubMed text |
| NLP Desk | [`epfl-llm/meditron-7b`](https://huggingface.co/epfl-llm/meditron-7b) | Meditron · Llama-2 (7B) | ≈48B tokens · PubMed + clinical guidelines |
| Vision foundation | [`microsoft/BiomedCLIP`](https://huggingface.co/microsoft/BiomedCLIP-PubMedBERT_256-vit_base_patch16_224) | ViT-B/16 + PubMedBERT (196M) | PMC-15M image–text pairs |

## What actually runs in the browser (the honesty ledger)

| Head | Status | How |
| --- | --- | --- |
| Symptom differential | **Real math** | Multinomial Naive Bayes trained at load from an embedded 2,550-row clinical reference table (`src/data/training.ts`) — priors from row counts, Laplace-smoothed likelihoods, posteriors computed per run |
| Upload X-ray score | **Real pixels** | Lung-band opacity + heterogeneity measured from the actual image on a downscaled canvas → fixed, published logistic head (`src/lib/pixel.ts`) |
| Derm risk profile | **Real pixels** | Mean / variance / heterogeneity of the lesion crop → 3-class softmax |
| CC → symptom matcher | **Real weights** | `Xenova/all-MiniLM-L6-v2` ONNX running via Transformers.js with cosine ranking |
| CNN weights (CXR + skin) | **Documented** | HF Hub lineage above — running them here awaits ONNX exports of the fine-tuned checkpoints |
| Red-flag rules | **Curated** | Clinical-guideline logic, deterministic and separate from the model |

"Real" = computed from data or measured from your input — still educational, never diagnostic.

### Running in-browser right now

[`Xenova/all-MiniLM-L6-v2`](https://huggingface.co/Xenova/all-MiniLM-L6-v2) — ONNX q8, ≈22.7 MB — is loaded on demand
via **Transformers.js** and powers the Symptom Lab's *Semantic Engine*: the patient's free-text chief complaint and
all 24 indexed symptom labels are encoded into 384-dim vectors and ranked by cosine similarity (threshold 0.22).
Weights are cached by the browser after the first pull; inference is fully client-side. The clinical heads above
still require ONNX exports of their fine-tuned checkpoints (or a FastAPI model server) before they can run the same way.

## System architecture

```
Patient Input ──► Preprocessing ──► CNN / Encoder ──► Softmax ──► Report
(symptoms,        (resize 224,       (Conv→Pool→       (class        (findings,
 radiographs,      ÷255, one-hot)      Dense head)      posteriors)    referral)
 dermoscopy)
```

## Curriculum coverage (all 13 steps)

1. **Dataset** — tabular symptom table + chest X-ray classes + ISIC-style dermoscopy
2. **Libraries** — TensorFlow/OpenCV/Pandas/Streamlit path documented in the pipeline walkthrough
3. **Image loading** — upload, drag-drop, `cv2.imread` semantics in the trace
4. **Normalization** — `÷255` shown live, with the "why" explained
5. **CNN build** — full `Sequential` Conv2D/MaxPooling2D/Flatten/Dense architecture
6. **Compile** — `adam` + `categorical_crossentropy`
7. **Train** — `model.fit(..., epochs=10, validation_data=...)`
8. **Predict** — two-class softmax with confidence bars
9. **Symptom diagnosis** — 24-dim one-hot vector → 12-profile differential
10. **AI report** — auto-generated patient analysis document
11. **Interface** — interactive console (React SPA instead of Streamlit)
12. **Evaluation** — confusion matrix, accuracy / precision / recall, model cards
13. **Deploy** — GitHub Pages via GitHub Actions

## Run locally

```bash
npm install
npm run dev        # develop
npm run build      # production build
```

## Project structure

```
├── src/
│   ├── components/      # StatusBar, labs, report, rail panels, QA bench, info sections
│   ├── data/medical.ts  # knowledge base: 24 symptoms, 12 diseases, chat KB, FAQs
│   ├── lib/engine.ts    # deterministic inference: hashing, softmax, prediction
│   ├── lib/tests.ts     # 20-case regression suite
│   └── App.tsx          # triage console shell
├── .github/workflows/   # GitHub Pages deployment
└── README.md
```

## Screenshots

Drop captures into `docs/` and link them here:

```markdown
![Symptom Lab](docs/symptom-lab.png)
```

## License

MIT — see [LICENSE](LICENSE).
