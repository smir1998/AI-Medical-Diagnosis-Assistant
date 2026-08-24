# MedLens·AI — Medical Diagnosis Assistant

[![Live](https://img.shields.io/badge/Live-smir1998.github.io%2Fmedlens--ai-0e7c72)](https://smir1998.github.io/medlens-ai/)
[![Build](https://img.shields.io/badge/build-passing-0e7c72)]()
[![License](https://img.shields.io/badge/license-MIT-c7463c)](LICENSE)

> **Deep Learning in Health Care** — a decision-support teaching console that fuses
> symptom-based disease prediction, chest X-ray classification, dermoscopy screening
> and a medical NLP desk into one generated patient report.
>
> ⚠️ **Educational tool, not a medical device.** All inference runs in-browser and is a
> deterministic simulation of real clinical ML pipelines. Never a replacement for a clinician.

![MedLens banner](https://image.qwenlm.ai/generated-images/597b72cb-81ed-4bdb-8a36-76013216f5ee/_result.png)

## ✦ What's inside

| Module | Stack analogue | What it demonstrates |
|---|---|---|
| **Symptom Lab** | NLP encoder + softmax head | 24 symptoms → weighted feature vector → 12-disease differential with ICD-10 codes, red-flag rules, severity tiers, specialty referrals |
| **Radiology Lab** | CNN (Conv → Pool → Dense) | X-ray upload or samples, `resize 224 · ÷255` pipeline log, Normal/Pneumonia softmax, Grad-CAM-style attention hotspot |
| **Derm Scan** | Transfer-learning CNN | Dermoscopy screening with ABCDE rule flags, 3-class benign/atypical/melanoma profile |
| **NLP Desk** | Medical chatbot | Keyword-matched knowledge base: CNNs, normalization, transfer learning, precision vs recall, triage guidance |
| **Report Engine** | Automated reporting | Multi-modal Patient Analysis Report (text + imaging + screening) with print/PDF export and physician sign-off line |
| **QA Bench** | Model evaluation | 20-case regression suite executed live in-browser against the real engine — precision/recall confusion matrix included |

## ✦ System architecture

```
Patient Input ──▶ Symptoms / Medical Image ──▶ Preprocessing ──▶ AI Model ──▶ Prediction ──▶ Medical Report
   (Symptom Lab)      (Radiology / Derm)       resize·normalize   CNN·softmax   ranked diffs    Report Engine
```

## ✦ Curriculum coverage — all 13 steps

1. **Dataset** — symptom table (Flu / COVID-19 / Migraine rows), chest X-ray Normal–Pneumonia classes, ISIC dermoscopy
2. **Libraries** — TensorFlow / OpenCV / Pandas pipeline shown in the walkthrough
3. **Load medical images** — drag-drop upload + sample studies
4. **Normalize** — `image / 255.0` with a convergence explainer
5. **CNN model** — full Keras `Sequential` architecture rendered in-app
6. **Compile** — `adam` + `categorical_crossentropy` + accuracy
7. **Train** — `model.fit(..., epochs=10, validation_data=...)`
8. **Predict** — `model.predict` → "Pneumonia 92% / Normal 8%"
9. **Symptom diagnosis** — `[fever, cough, fatigue]` → Influenza
10. **AI report** — symptoms, prediction, confidence, recommendation
11. **Interface** — interactive upload + analyze flow (web build instead of Streamlit)
12. **Evaluation** — accuracy / precision / recall, confusion matrix, model cards
13. **Deploy** — GitHub Pages via Actions (this very site)

Plus the mini-challenge: X-ray classification ✅ · skin disease detection ✅ · chatbot ✅ · PDF reports ✅ · doctor recommendation engine ✅

## ✦ Run locally

```bash
npm install
npm run dev        # local development
npm run build      # production build → dist/
npm run typecheck  # strict TS check
```

## ✦ Deploy

GitHub Pages is wired through `.github/workflows/deploy.yml`. After enabling
**Settings → Pages → Source: GitHub Actions**, every push to `main` rebuilds with
`--base=./` and publishes to <https://smir1998.github.io/medlens-ai/>.

> **Site shows “There isn't a GitHub Pages site here”?** It's a settings issue, not a
> build issue:
> 1. Repo **Settings → Pages → Build and deployment → Source** must be **GitHub Actions**
>    (not “Deploy from a branch”).
> 2. The repo must be **public** (free-tier Pages doesn't serve private repos) and named
>    exactly `medlens-ai` — the URL path has to match the repo name.
> 3. Check the **Actions** tab: the *Deploy to GitHub Pages* run must be green.
>    No run at all → `.github/workflows/deploy.yml` wasn't pushed; re-run with
>    `git add -A && git commit -m "add pages workflow" && git push`.
> 4. First publish takes ~1–2 minutes — then hard-refresh.

## ✦ Project structure

```
medlens-ai/
├── src/
│   ├── components/     # StatusBar, SymptomChecker, ImageAnalysis, DermScan,
│   │                   # Chatbot, ReportPanel, RailPanels, InfoSections, QABench
│   ├── data/medical.ts # 24 symptoms · 12 disease profiles · red-flag rules · NLP KB
│   ├── lib/engine.ts   # deterministic inference: softmax scoring, CNN simulation
│   ├── lib/tests.ts    # 20-case QA regression suite
│   ├── App.tsx         # triage console composition
│   └── index.css       # ECG-grid design system, motion, print rules
├── .github/workflows/  # Pages deployment
├── index.html
└── README.md
```

## ✦ Screenshots

Add captures to `docs/` and link them here, e.g. `![Symptom Lab](docs/symptom-lab.png)`.

## ✦ Disclaimer

MedLens·AI is a **learning tool and decision-support simulation**. Its outputs come from a
hand-built knowledge base and simulated CNNs — they must never replace examination by a
licensed healthcare professional. In an emergency, call your local emergency number.

---

*Built for the AI curriculum · Project #8 track — Computer Vision · Deep Learning · NLP · Healthcare AI*
