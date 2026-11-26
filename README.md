# MedLens AI

MedLens AI is an educational demonstration of medical software concepts. It is not a medical device, diagnostic tool, or source of personal medical advice. Do not use its results to make healthcare decisions.

## What the app does

- **Patient list:** keeps sample patient entries in page memory, shows a demo-data notice, and provides a clear-all control. Data persistence and clinical record management are not implemented; do not enter real patient information.
- **Symptom Lab:** produces hand-weighted relative scores from a small set of built-in disease profiles. These are not calibrated probabilities or diagnoses.
- **Radiology Lab:** offers separate models for frontal chest X-rays and orthopedic X-rays. The chest model is TorchXRayVision `densenet121-res224-all`, which returns 18 independent findings and a selectable class activation map. The FracAtlas-trained orthopedic model is a ConvNeXt-Tiny classifier; it returns a fracture score and Grad-CAM map. Scores are research outputs, not diagnoses or calibrated patient probabilities. Model assets and the ONNX browser runtime download on first use; inference runs in the browser, so uploaded image pixels are not sent to an inference server. Synthetic illustrations are excluded from model scoring.
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

The app has not been clinically validated. Both radiology models are provided for research and education only and must not be used for diagnosis, triage, treatment, or care decisions. The chest model returns 18 independent outputs: Atelectasis, Consolidation, Infiltration, Pneumothorax, Edema, Emphysema, Fibrosis, Effusion, Pneumonia, Pleural Thickening, Cardiomegaly, Nodule, Mass, Hernia, Lung Lesion, Fracture, Lung Opacity, and Enlarged Cardiomediastinum. These are model scores, not calibrated probabilities, comparative disease likelihoods, or patient-specific conclusions. The orthopedic model screens only the body regions and image distribution represented in FracAtlas; it is not suitable for chest X-rays, CT, MRI, skull, spine, or rib images. A below-cutoff score cannot rule out fracture. Both models' activation maps are coarse and do not outline a lesion or fracture. Published benchmark performance varies across datasets and should not be treated as validation for this app or its users. Do not upload identifiable patient data. Contact a qualified clinician for health concerns or local emergency services for emergencies.

The integrated checkpoint is [TorchXRayVision DenseNet](https://mlmed.org/torchxrayvision/models.html), which combines multiple public chest radiograph datasets. TorchXRayVision's source code and weights are distributed under Apache-2.0; this app's code is MIT-licensed. Read the linked model documentation and benchmark tables for its intended outputs and dataset-specific performance. The included export utility is `scripts/export_xrv_onnx.py`.

The orthopedic classifier is [Akinchan Jain's FracAtlas ConvNeXt-Tiny model](https://huggingface.co/akinchanJain7/fracture-detection-model), released under MIT. It was trained and evaluated on FracAtlas, a musculoskeletal X-ray dataset licensed CC BY 4.0; this app includes the required attribution and links below. The model author's held-out test report gives 0.922 recall and 0.708 specificity at a threshold selected on validation, with 0.398 precision. Those results are not an evaluation of this app or evidence of clinical performance. Its scope is limited to the FracAtlas anatomy and image distribution. Its score does not confirm or rule out a fracture, and its Grad-CAM is a coarse activation map, not a fracture outline. The exported ONNX weights were statically quantized for browser deployment; the conversion script is `scripts/export_fracatlas_onnx.py`.

FracAtlas attribution: Abedeen et al., [“FracAtlas: A Dataset for Fracture Classification, Localization and Segmentation of Musculoskeletal Radiographs”](https://doi.org/10.1038/s41597-023-02432-4), Scientific Data 10, 521 (2023), [dataset DOI](https://doi.org/10.6084/m9.figshare.22363012), CC BY 4.0. Model weights and data are not included together: the app redistributes the author's model checkpoint converted to ONNX and does not include FracAtlas images.

## License

The application code is licensed under MIT; see [LICENSE](LICENSE). Dataset terms may differ; review the [dataset notice](public/DATASET-NOTICE.md) before reuse.
