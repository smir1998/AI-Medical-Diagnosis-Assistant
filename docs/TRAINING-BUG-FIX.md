# Training Grounds: row-level dataset training

The trainer now loads `public/Training.csv`, the row-level training file from the Disease Symptom Prediction dataset. It no longer repeats one disease-to-symptom profile 50 times.

## Training pipeline

- The source CSV contains 4,920 labeled rows across 41 disease labels.
- The app trims and normalizes symptom column names, collapses duplicate columns, and encodes the remaining 131 unique symptom features.
- The multinomial logistic model trains on the source rows directly. Duplicate rows retain their source frequency; the app creates no synthetic rows.
- For evaluation, rows with the same symptom signature are grouped together. A deterministic, per-class 80/20 profile split keeps identical profiles on one side, preventing exact duplicates from appearing in both training and holdout sets.
- The displayed metrics describe this educational dataset and split only. They are not clinical performance estimates.

## Dataset source and attribution

Disease Symptom Prediction by Pranay Patil (`itachi9604`), [Kaggle dataset](https://www.kaggle.com/datasets/itachi9604/disease-symptom-description-dataset). The bundled `Training.csv` is sourced from the author's [healthcare-chatbot repository](https://github.com/itachi9604/healthcare-chatbot/blob/master/Data/Training.csv). The Kaggle dataset metadata identifies the license as CC BY-SA 4.0; see [public/DATASET-NOTICE.md](../public/DATASET-NOTICE.md).

## Limits

The source is a small educational symptom-label dataset, not a representative clinical cohort. Repeated source rows and curated symptom combinations can make holdout metrics optimistic even when duplicate profiles are kept together. The model must not be used to diagnose or guide care.
