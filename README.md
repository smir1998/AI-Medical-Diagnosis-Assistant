# MedLens AI

MedLens AI is an educational demonstration of medical software concepts. It is not a medical device, diagnostic tool, or source of personal medical advice. Do not use its results to make healthcare decisions.

## What the app does

- **Patient list:** keeps sample patient entries in page memory, shows a demo-data notice, and provides a clear-all control. Data persistence and clinical record management are not implemented; do not enter real patient information.
- **Symptom Lab:** produces hand-weighted relative scores from a small set of built-in disease profiles. These are not calibrated probabilities or diagnoses.
- **Radiology Lab:** reads local image pixels and reports dimensions, mean luminance, luminance variation, pixel range, and sample count. It does not classify the image or run a trained radiology model.
- **Chatbot:** matches keywords to a small static set of educational answers. It is not a medical language model and cannot assess symptoms or urgency.
- **Model Registry:** links to external model projects for reference. They are not integrated into this app.
- **Training Grounds:** trains a separate multinomial logistic model on rows from the bundled `public/Training.csv` teaching dataset and reports metrics on a deterministic grouped holdout split. This model does not power Symptom Lab, and its metrics do not establish clinical performance.
- **Reports:** summarizes the current demo results and their educational context.

## Dataset

The bundled `Training.csv` contains 4,920 rows, 41 labels, and 131 unique symptom features after normalization. Identical symptom profiles are kept in the same split to avoid profile leakage between training and holdout evaluation. The dataset is a curated teaching dataset, not a verified cohort of real patient records. See the [dataset notice](public/DATASET-NOTICE.md) for attribution and license details.

## Run locally

```bash
npm ci
npm run dev
```

Create a production build with:

```bash
npm run build
```

Run the unit and integration checks with Node.js 22 or newer:

```bash
npm test
```

## Limitations

The app has not been clinically validated. It does not provide diagnoses, treatment recommendations, or emergency triage. Image results are simulated, symptom scores are hand-weighted, and the trained model is a standalone educational exercise. Contact a qualified clinician for health concerns or local emergency services for emergencies.

## License

The application code is licensed under MIT; see [LICENSE](LICENSE). Dataset terms may differ; review the [dataset notice](public/DATASET-NOTICE.md) before reuse.
