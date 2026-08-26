# 🩺 MedLens·AI — Medical Diagnosis Assistant

> **Deep Learning in Health Care** — an AI triage workstation combining a patient registrar,
> an SGD-trained symptom head, a chest X-ray pipeline, a dermoscopy classifier, a real in-browser
> transformer encoder, and a medical NLP desk — fused into one decision-support console with a
> 41-case QA bench.

[![Live on GitHub Pages](https://img.shields.io/badge/LIVE-GitHub%20Pages-0e7c72)](https://smir1998.github.io/AI-Medical-Diagnosis-Assistant/)
[![QA Bench](https://img.shields.io/badge/QA-41%20cases%20in--browser-16241f)](https://smir1998.github.io/AI-Medical-Diagnosis-Assistant/)
[![🤗 Transformers.js](https://img.shields.io/badge/🤗-Transformers.js-FFD21E)](https://huggingface.co/Xenova/all-MiniLM-L6-v2)
[![License: MIT](https://img.shields.io/badge/License-MIT-a16207.svg)](LICENSE)

⚠️ **Educational simulation — not a medical device.** Nothing here is a clinical diagnosis and no
data ever leaves the browser. If symptoms are severe or worsening, contact a clinician or your local
emergency number.

![MedLens console](https://smir1998.github.io/AI-Medical-Diagnosis-Assistant/og-banner.svg)

---

## What's inside

| Module | Technique | What it does |
| --- | --- | --- |
| **Registrar** | On-device admission log (localStorage) | Intake form (name, age, sex, chief complaint, allergies, CTAS triage 1–5, HR/BP/SpO₂/temp vitals), auto-issued MRNs, clinical flag engine (hypoxia, tachycardia, febrile…), CSV export, chart/discharge workflow — the active patient stamps every report |
| **Symptom Lab** | Multinomial Naive Bayes + one-hot vector UI | 24-dim symptom vector with live cell animation, scenario presets, softmax differential over 12 profiles, ICD-10 codes, severity tiers, red-flag rules |
| **Training Grounds** | **Live SGD training in your browser** | Trains a multinomial logistic head on real disease–symptom associations (Kaggle), draws the loss curve epoch-by-epoch, and reports **measured** accuracy/precision/recall/F1 on a held-out split |
| **Semantic Engine** | `Xenova/all-MiniLM-L6-v2` via Transformers.js | Real ONNX transformer inference: free-text chief complaint → cosine-ranked symptom vector, lazy-loaded (~23 MB q8 weights, cached) |
| **Radiology Lab** | Simulated CNN + real pixel-statistics head | Upload or load bundled synthetic teaching studies; decode → resize 224 → ÷255 → Conv/Pool trace → softmax; Grad-CAM-style hotspot; honest "synthetic" labeling |
| **Derm Scan** | CLAHE → Otsu ROI → 3-class head + ABCDE engine | Benign / atypical / melanoma-pattern screening with ABCDE rule flags |
| **NLP Desk** | Keyword-weighted medical Q&A | CNNs, normalization, transfer learning, precision/recall, HF lineage, triage guidance |
| **Model Registry** | Verified Hugging Face Hub lineage | Real production model per head, linked to live model pages (table below) |
| **Report Engine** | Multi-modal report compilation | Printable patient analysis report (Print → PDF), vitals, flags, referral recommendations |
| **QA Bench** | 41-case in-browser regression suite | Tests the live engine across 11 suites — SGD convergence, measured accuracy, HF model-registry integrity, invariants and edge cases (table below) |

## Real data — public datasets

| Dataset | Size | Used for |
| --- | --- | --- |
| [Chest X-Ray (Kaggle)](https://www.kaggle.com/datasets/paultimothymooney/chest-xray-pneumonia) | 5,856 radiographs | Radiology lineage |
| [HAM10000](https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/DBW86T) | 10,015 dermoscopy lesions, 7 classes | Derm lineage |
| [ISIC 2019](https://challenge2019.isic-archive.com/) | 25,331 images | Derm lineage |
| [Disease-Symptom Prediction (Kaggle)](https://www.kaggle.com/datasets/itachi9604/disease-symptom-description-dataset) | 30 diseases × ~70 symptoms | **Trains the live SGD head** |

## Model lineage (Hugging Face Hub)

The console runs deterministic teaching heads so every step stays interview-explainable. These are the
verified production models a clinical deployment would load — one per diagnostic head:

| Console head | Model | Status |
| --- | --- | --- |
| Radiology Lab | [`keremberke/resnet-50-chest-xray-classification`](https://huggingface.co/keremberke/resnet-50-chest-xray-classification) | ⏳ needs ONNX export of the fine-tune |
| Derm Scan | [`syaha/skin_cancer_detection_model`](https://huggingface.co/syaha/skin_cancer_detection_model) | ⏳ HAM10000 · needs ONNX export |
| Symptom encoding | [`microsoft/BiomedNLP-PubMedBERT-base-uncased-abstract-fulltext`](https://huggingface.co/microsoft/BiomedNLP-PubMedBERT-base-uncased-abstract-fulltext) | ⏳ 110M · awaits q8 port (~440 MB fp32) |
| Medical Q&A | [`epfl-llm/meditron-7b`](https://huggingface.co/epfl-llm/meditron-7b) | ⏳ 7B · server territory |
| Vision foundation | [`microsoft/BiomedCLIP-PubMedBERT_256-vit_base_patch16_224`](https://huggingface.co/microsoft/BiomedCLIP-PubMedBERT_256-vit_base_patch16_224) | ⏳ 196M · awaits q8 port |

- **Already running in this browser:** [`Xenova/all-MiniLM-L6-v2`](https://huggingface.co/Xenova/all-MiniLM-L6-v2) — the Semantic Engine performs real ONNX inference with its q8 weights (~23 MB, lazy-loaded and cached).
- **Already training in this browser:** the Training Grounds' logistic head reports accuracy measured on a held-out split of real disease–symptom associations — never invented numbers.

*Honesty policy: simulated heads say so in the UI. Figures quoted for them illustrate published
benchmarks; only the Training Grounds and the Semantic Engine produce measured outputs.*

## System architecture

```
 Patient intake ──► Preprocessing ──► Heads ──────────────► Softmax ──► Report
 (Registrar:        (resize 224,      • SGD-trained symptom   (class      (findings,
  name, vitals,      ÷255, one-hot,     head (measured acc)    posteriors,  vitals,
  triage, CC)        CLAHE, Otsu)      • CNN pipeline          red flags)   referral,
                                       • MiniLM-L6-v2 encoder               ICD-10,
                                         (chief complaint)                  print/PDF)
                                       • NLP desk
```

## QA bench — 41 cases, 11 suites

| Suite | Cases | Covers |
| --- | --- | --- |
| Symptom NLP | 7 | differential correctness, red-flag rules, softmax invariants, determinism |
| Radiology CNN | 3 | class ranges, heat-map bounds, determinism |
| Pixel Head | 2 | opacity monotonicity, bounded logits |
| Trained Model (NB) | 4 | posterior normalization, data-derived priors, dataset-grounded associations |
| NLP Desk | 8 | KB matching, honest-limitations answer, keyword-strength arbitration |
| Derm Screen | 4 | pixel statistics, 3-class softmax, ABCDE flags |
| Registrar | 4 | intake validation, vitals flags, MRN issuance, CSV escaping |
| Model Zoo | 2 | repo-id integrity, console coverage |
| Semantic Utils | 2 | cosine identity/orthogonality, NaN guards |
| Bundle | 1 | sample studies must ship bundled, never remote |
| Live Trainer | 4 | SGD convergence, measured accuracy ≥ 70%, bit-identical determinism, trained-head behavior |

## Curriculum coverage (all 13 steps)

1. **Dataset** ✅ 2. **Libraries** ✅ 3. **Image loading** ✅ 4. **Normalization** ✅
5. **CNN build** ✅ 6. **Compile** ✅ 7. **Train** ✅ 8. **Predict** ✅
9. **Symptom diagnosis** ✅ 10. **AI report** ✅ 11. **Interface** ✅ 12. **Evaluation** ✅ 13. **Deploy** ✅

## Run locally

```bash
npm install
npm run dev        # develop at localhost:5173
npm run build      # production build → dist/
npm test           # repo-level regression tests (node:test)
```

First Semantic Engine arm pulls ~23 MB of ONNX weights once (cached afterwards).

## Deploy (GitHub Pages via Actions)

One-time: **Settings → Pages → Source: "GitHub Actions"**. Every push to `main` builds with
`--base=./` and publishes to `https://smir1998.github.io/AI-Medical-Diagnosis-Assistant/`.
The deploy job verifies via the Pages API that Pages is enabled and fails with actionable
instructions instead of a raw 404 stack trace.

If GitHub reports a branch merge conflict, follow **[MERGE.md](MERGE.md)** — `bash resolve-conflicts.sh`
keeps the branch content for every conflicting file in one command.

## Project structure

```
├── public/og-banner.svg           # stable social/README banner
├── src/
│   ├── assets/                    # bundled SVG teaching studies (no remote images)
│   ├── components/                # Registrar, labs, report, rail, registry, trainer, QA bench
│   ├── data/
│   │   ├── medical.ts             # 24 symptoms, 12 profiles, chat KB, HF zoo, FAQs
│   │   ├── diseaseSymptomDataset.ts  # real Kaggle associations
│   │   └── training.ts            # embedded NB reference table
│   └── lib/
│       ├── engine.ts              # deterministic inference core
│       ├── naiveBayes.ts          # NB head trained from the reference table
│       ├── train.ts               # live SGD trainer + measured metrics
│       ├── semantic.ts            # Transformers.js MiniLM encoder
│       └── tests.ts               # 41-case in-app QA bench
├── tests/                         # repo-level node:test regression suite
├── .github/workflows/deploy.yml   # Pages deployment (with Pages-enabled preflight)
└── README.md
```

## License

MIT — see [LICENSE](LICENSE).
