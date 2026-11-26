# MedLens AI

MedLens AI is an educational demonstration of medical software concepts. It is not a medical device, diagnostic tool, or source of personal medical advice. Do not use its results to make healthcare decisions.

## What the app does

- **Patient list:** keeps sample patient entries in page memory, shows a demo-data notice, and provides a clear-all control. Data persistence and clinical record management are not implemented; do not enter real patient information.
- **Symptom Lab:** produces hand-weighted relative scores from a small set of built-in disease profiles. These are not calibrated probabilities or diagnoses.
- **Radiology Lab:** runs the TorchXRayVision `densenet121-res224-all` pretrained model on uploaded frontal chest X-rays and ranks 18 independently-scored findings. Selecting a finding displays its class activation map alongside basic image-pixel measurements. Model weights (~28.3 MB) and the ONNX browser runtime download on first use; inference runs in the browser, so uploaded image pixels are not sent to an inference server. Synthetic illustrations are excluded from model scoring.
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

The app has not been clinically validated. The radiology model is provided for research and education only and must not be used for diagnosis, triage, treatment, or care decisions. It is a chest X-ray model and does not read other body parts. It returns 18 independent outputs: Atelectasis, Consolidation, Infiltration, Pneumothorax, Edema, Emphysema, Fibrosis, Effusion, Pneumonia, Pleural Thickening, Cardiomegaly, Nodule, Mass, Hernia, Lung Lesion, Fracture, Lung Opacity, and Enlarged Cardiomediastinum. These are model scores, not calibrated probabilities, comparative disease likelihoods, or patient-specific conclusions. The model activation map is coarse and does not outline a lesion. Published benchmark performance varies across datasets and should not be treated as validation for this app or its users. Do not upload identifiable patient data. Contact a qualified clinician for health concerns or local emergency services for emergencies.

The integrated checkpoint is [TorchXRayVision DenseNet](https://mlmed.org/torchxrayvision/models.html), which combines multiple public chest radiograph datasets. TorchXRayVision's source code and weights are distributed under Apache-2.0; this app's code is MIT-licensed. Read the linked model documentation and benchmark tables for its intended outputs and dataset-specific performance. The included export utility is `scripts/export_xrv_onnx.py`.

## License

The application code is licensed under MIT; see [LICENSE](LICENSE). Dataset terms may differ; review the [dataset notice](public/DATASET-NOTICE.md) before reuse.
