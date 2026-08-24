# MedLens · AI Medical Diagnosis Assistant

**Deep Learning in Health Care** — a triage console that fuses a symptom encoder, a chest-X-ray CNN, a dermoscopy CNN and a medical NLP desk into one decision-support report.

[![License: MIT](https://img.shields.io/badge/License-MIT-0E7C72?style=flat-square)](./LICENSE)
[![Stack](https://img.shields.io/badge/React_18_%C2%B7_Vite_%C2%B7_TypeScript-123030?style=flat-square)](https://vitejs.dev)
[![QA Bench](https://img.shields.io/badge/QA%20Bench-20%2F20%20cases%20passing-0E7C72?style=flat-square)](#qa-bench)
[![Status](https://img.shields.io/badge/Status-Educational%20simulation-D7453B?style=flat-square)](#disclaimer)

![MedLens banner](https://image.qwenlm.ai/generated-images/597b72cb-81ed-4bdb-8a36-76013216f5ee/_result.png)

> [!WARNING]
> MedLens is a **learning tool and decision-support simulation, not a medical device**. Its predictions come from a hand-built knowledge base and simulated CNNs. They must never replace examination by a licensed clinician. In an emergency, call your local emergency number.

---

## What it does

| Module | Input | Output |
| --- | --- | --- |
| **Symptom Lab** | 24 symptoms + duration + severity (1–10) | 12-profile softmax differential with confidence %, ICD-10 codes, severity tiers, red-flag engine |
| **Radiology Lab** | Chest X-ray (drag-drop upload or teaching samples) | Normal vs Pneumonia probabilities + Grad-CAM-style attention hotspot |
| **Derm Scan** | Dermoscopy photo (upload or teaching samples) | 3-class risk profile (benign / atypical / melanoma-pattern) + ABCDE rule flags |
| **NLP Desk** | Free-text questions | Keyword-matched medical Q&A (CNNs, normalization, transfer learning, metrics, triage) |
| **Report Engine** | Any combination of the above | Patient Analysis Report with recommendations, specialty referral, print → PDF |
| **QA Bench** | In-app regression runner | 20 deterministic test cases executed against the live engine |

**Red-flag rules** fire for chest pain, breathlessness, night sweats, unexplained weight loss, and the fever–headache–vomiting meningitis triad — always escalated to in-person care.

## System architecture

```
Patient input ──▶ Symptoms / medical image ──▶ Preprocessing (resize 224 · ÷255)
     │
     ▼
Simulated CNN / NLP encoder ──▶ Softmax ──▶ Prediction + confidence
                                                │
Session log ◀── Live pipeline rail ◀── Report ◀─┘
```

All inference is **deterministic and runs entirely in the browser** — nothing leaves your machine.

## Curriculum coverage — the 13 steps

| # | Step | Where it lives |
| --- | --- | --- |
| 1 | Choose a dataset | Tabular symptom table, chest X-ray & ISIC dermoscopy classes (`src/data/medical.ts`) |
| 2 | Install libraries | Pipeline walkthrough: TensorFlow / OpenCV / Pandas / Streamlit |
| 3 | Load medical images | Drag-drop upload + `FileReader` decode in both imaging labs |
| 4 | Normalize data (÷255) | Shown in every pipeline log; convergence callout in *Model internals* |
| 5 | Build CNN | Full Keras `Sequential` Conv2D → MaxPooling → Dense architecture |
| 6 | Compile model | `adam` + `categorical_crossentropy` in the training walkthrough |
| 7 | Train model | `model.fit(..., epochs=10, validation_data=...)` with transfer-learning cards |
| 8 | Make predictions | Two-class softmax with confidence bars |
| 9 | Symptom-based diagnosis | Weighted feature vector → 12-profile softmax differential |
| 10 | Generate AI report | Auto report: symptoms, prediction, confidence, recommendation |
| 11 | Interface | Interactive console (web build in place of Streamlit) |
| 12 | Model evaluation | Confusion matrix, accuracy / precision / recall, recall-first rationale |
| 13 | Deploy | GitHub Pages workflow included (below) |

**Bonus tiers:** multi-disease detection ×12, PDF reports (print engine), doctor recommendation engine (specialty + ICD-10), chatbot, multi-modal text+image reports, and a live QA bench.

## QA bench

The status bar's **QA BENCH** button runs 20 regression cases in-browser against the real engine functions — no mocks:

- Symptom NLP (7): classic flu, cardiac red flags, meningitis triad, negative-weight demotion, humble single-symptom confidence, softmax Σ=100 invariant, determinism
- Radiology CNN (4): sample bounds, upload determinism, 12-seed sweep
- NLP desk (5): matcher hits + graceful gibberish fallback
- Derm screen (4): pixel-statistics heuristics, 3-class normalization, ABCDE flags

## Run it locally

```bash
npm install
npm run dev        # local dev server
npm run build      # production build → dist/
npm run typecheck  # strict TS check
```

## Deploy to GitHub Pages

1. Push this repo to GitHub (see below).
2. **Settings → Pages → Source: GitHub Actions**.
3. Push to `main` (or trigger manually) — the workflow in `.github/workflows/deploy.yml` builds with `--base=./` and publishes.
4. Your app appears at `https://<username>.github.io/<repo-name>/`.

## Project structure

```
medlens-ai/
├── index.html
├── src/
│   ├── App.tsx                    # console shell, tabs, session log, report wiring
│   ├── data/medical.ts            # symptoms, 12 disease profiles, chat KB, metrics
│   ├── lib/engine.ts              # softmax engine, hashing, CNN/derm simulation
│   ├── lib/tests.ts               # 20-case regression suite
│   └── components/
│       ├── SymptomChecker.tsx     # NLP-encoded differential diagnosis
│       ├── ImageAnalysis.tsx      # chest X-ray CNN + Grad-CAM hotspot
│       ├── DermScan.tsx           # dermoscopy CNN + ABCDE checklist
│       ├── Chatbot.tsx            # medical Q&A desk
│       ├── ReportPanel.tsx        # patient analysis report + print/PDF
│       ├── QABench.tsx            # in-app test runner modal
│       ├── RailPanels.tsx         # pipeline visualizer, model vitals, session log
│       ├── InfoSections.tsx       # training walkthrough, evaluation, FAQs
│       ├── StatusBar.tsx          # hospital monitor: clock, ECG, QA trigger
│       └── ui.tsx                 # icons, reveals, count-ups, ECG trace
└── .github/workflows/deploy.yml   # GitHub Pages deployment
```

## Screenshots

Drop captures of the console into `docs/` and link them here:

```markdown
![Symptom Lab](docs/symptom-lab.png)
![Radiology Lab](docs/radiology-lab.png)
```

## Disclaimer

Educational simulation for AI-curriculum Project: Deep Learning in Health Care. Not a diagnosis, not medical advice. Consult a licensed healthcare professional.

## License

[MIT](./LICENSE)
