# MedLens AI

MedLens AI is an educational demonstration of medical software concepts. It is not a medical device, diagnostic tool, or source of personal medical advice. Do not use its results to make healthcare decisions.

## What the app does

- **Patient list:** keeps sample patient entries in page memory, shows a demo-data notice, and provides a clear-all control. Data persistence and clinical record management are not implemented; do not enter real patient information.
- **Symptom Lab:** produces hand-weighted relative scores from a small set of built-in disease profiles. These are not calibrated probabilities or diagnoses.
- **Radiology Lab:** runs a pretrained binary pneumonia classifier on uploaded frontal chest X-rays, displays its model score and Grad-CAM activation map, and reports basic image-pixel measurements. Model weights (~56.5 MB) and the ONNX browser runtime download on first use; inference runs in the browser, so uploaded image pixels are not sent to an inference server. Synthetic illustrations are excluded from model scoring.
- **Chatbot:** matches keywords to a small static set of educational answers. It is not a medical language model and cannot assess symptoms or urgency.
- **Model Registry:** links to external model projects for reference.
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

The app has not been clinically validated. The radiology model is provided for research and education only and must not be used for diagnosis, triage, treatment, or care decisions. It covers pneumonia on frontal chest radiographs only. Its training card reports held-out AUROC 0.990 for a pediatric source and 0.890 for an adult source, but also reports AUROC 0.746 and sensitivity 0.071 on a third external pediatric hospital; performance varies with site, age, and view. Its threshold is not validated for this app's users. The Grad-CAM map indicates model activation, not a lesion boundary or proof of disease. Do not upload identifiable patient data. Contact a qualified clinician for health concerns or local emergency services for emergencies.

The integrated checkpoint is [emir-mutlu/pneumonia-cxr-convnext](https://huggingface.co/emir-mutlu/pneumonia-cxr-convnext), licensed by its author for research and education only. Model weights, model code, and this app's MIT-licensed code have separate terms. See the [model card](https://huggingface.co/emir-mutlu/pneumonia-cxr-convnext) and [training and evaluation repository](https://github.com/emir-mutlu/pneumonia-cxr-detection) for training data, evaluation, and limitations.

## License

The application code is licensed under MIT; see [LICENSE](LICENSE). Dataset terms may differ; review the [dataset notice](public/DATASET-NOTICE.md) before reuse.
