# MedLens·AI — LinkedIn Kit

Live site: https://smir1998.github.io/AI-Medical-Diagnosis-Assistant/
Repo: https://github.com/smir1998/AI-Medical-Diagnosis-Assistant

---

## 1. Profile → Projects section

**How:** Me → View profile → Add profile section → Recommended → Add projects.

| Field | Value |
| --- | --- |
| Project name | MedLens·AI — AI Medical Diagnosis Assistant |
| Currently working on it | No (or Yes, if you're continuing) |
| Start date | 2026 |
| URL | https://smir1998.github.io/AI-Medical-Diagnosis-Assistant/ |
| Creators | Your name |
| Associated with | (link your education or current role) |

**Description (paste):**

> MedLens·AI is an end-to-end AI triage console built to demonstrate the complete deep-learning pipeline in healthcare — from patient intake to printed report — running entirely in the browser.
>
> Four diagnostic heads: a symptom encoder scoring 12 disease profiles with a softmax head (ICD-10 codes, severity tiers, red-flag rules), a chest X-ray analysis pipeline (decode → resize 224 → ÷255 → CNN → Grad-CAM attention hotspot), a dermoscopy classifier with an ABCDE rule engine, and a medical NLP Q&A desk — fused into one decision-support report with doctor referral recommendations.
>
> What runs genuinely on-device: a logistic head trained with mini-batch SGD on the public Kaggle Disease-Symptom dataset, with accuracy/precision/recall/F1 measured on a held-out split; an ONNX transformer (all-MiniLM-L6-v2, Transformers.js) that semantically maps free-text chief complaints into a 24-symptom feature vector; and a 41-case QA regression suite auditing the live engine in-browser.
>
> Stack: React, TypeScript, Vite, Transformers.js, ONNX Runtime WebAssembly, GitHub Actions → GitHub Pages. Zero backend — all inference is local and no data leaves the browser. Educational decision-support tool, not a medical device.

**Skills to attach:** Deep Learning · Convolutional Neural Networks (CNN) · Computer Vision · Natural Language Processing (NLP) · Transfer Learning · Healthcare AI · React.js · TypeScript · ONNX · Model Evaluation · CI/CD

---

## 2. Resume bullets (pick 3–4)

- Built MedLens·AI, a browser-based AI medical triage console with four diagnostic heads (symptom encoder, chest X-ray CNN pipeline, dermoscopy classifier, NLP desk) that generates a printable multi-modal patient report with ICD-10 codes and specialty referrals.
- Implemented real in-browser model training — multinomial logistic regression via mini-batch SGD on the Kaggle Disease-Symptom dataset — reporting measured held-out accuracy, precision, recall, and F1 rather than claimed figures.
- Integrated genuine ONNX transformer inference (all-MiniLM-L6-v2 via Transformers.js) to semantically map free-text chief complaints to a 24-dim symptom vector, lazy-loaded with code splitting to keep first paint at ~45 KB.
- Engineered the quality gates: a 41-case in-browser QA regression suite, print-isolated PDF report generation, a patient registrar with vitals-based clinical flags, and a GitHub Actions pipeline deploying to GitHub Pages with self-diagnosing failure modes.

---

## 3. Post — Draft A (technical story, recommended)

Most "AI in healthcare" demos are mockups with hardcoded numbers. I wanted the whole pipeline — so I built one that runs entirely in the browser.

MedLens·AI is an AI triage console with four diagnostic heads:
→ Symptom encoder: 24-dim one-hot vector → softmax over 12 disease profiles, with ICD-10 codes, severity tiers and red-flag rules
→ Chest X-ray pipeline: decode → resize → normalize → CNN trace → Grad-CAM attention hotspot
→ Dermoscopy screening with the ABCDE rule engine
→ A medical NLP desk for pipeline Q&A

The parts I'm most proud of run real model code on-device:
• A logistic head trained with SGD on the Kaggle Disease-Symptom dataset — accuracy, precision, recall and F1 measured on a held-out split, never invented
• An ONNX transformer (all-MiniLM-L6-v2) that semantically maps free-text like "feels like an elephant sitting on my chest" to chest pain + breathlessness — real cosine similarity in 384-dim space
• A 41-case QA suite that audits the live engine in the browser

No server. No GPU. Nothing leaves the browser. It's a static site on GitHub Pages.

Live demo and repo in the first comment.

Honest footnote: this is educational decision-support, not a medical device — and knowing exactly where the simulation ends and the clinic begins is its own engineering skill.

#DeepLearning #HealthcareAI #ComputerVision #NLP #MachineLearning #ONNX #React #MedTech

---

## 4. Post — Draft B (short hook)

I taught a browser to train a model, classify symptoms, and write a patient report — with zero backend.

MedLens·AI: four AI heads (symptom encoder, chest X-ray CNN, dermoscopy screening, medical chatbot), real SGD training in-browser on a real dataset with measured metrics, an ONNX transformer for semantic triage, and a 41-case QA suite — shipped as one static site.

Live link in the first comment.

#DeepLearning #HealthcareAI #MachineLearning #AIinHealthcare

---

## 5. Publishing tips

1. **Link in the first comment** — LinkedIn suppresses reach on posts with links in the body. Post the text, then immediately comment the live URL + repo.
2. **Attach 2–3 screenshots** to the post (they outperform text-only by a wide margin):
   - Symptom Lab with a differential diagnosis + the live 24-dim vector strip
   - Training Grounds with the loss curve and measured metrics
   - The generated patient analysis report
   - Or use `public/og-banner.svg` as the single image.
3. **Add to Featured** — after posting, click the ⋯ on the post → "Feature on top of profile."
4. **Headline idea** (profile):
   `Deep Learning Engineer | Healthcare AI · Computer Vision · NLP | I build ML systems that run in the browser`
5. **Best time to post** — Tuesday/Wednesday/Thursday, 8–10 AM in your network's timezone.
6. **Engage the first hour** — replies in the first 60 minutes decide distribution; ask a question at the end if you like, e.g. "What's your take — should clinical AI tools publish measured metrics the way ML papers do?"
