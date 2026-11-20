import { useState } from "react";
import { trainModel, type TrainedModel } from "../lib/train";
import { loadDiseaseDataset } from "../lib/diseaseDataset";

export function TrainingGrounds({ onTrained }: { onTrained: (m: TrainedModel) => void }) {
  const [training, setTraining] = useState(false);
  const [epoch, setEpoch] = useState(-1);
  const [lossHist, setLossHist] = useState<number[]>([]);
  const [accHist, setAccHist] = useState<number[]>([]);
  const [model, setModel] = useState<TrainedModel | null>(null);
  const [error, setError] = useState("");

  const train = async () => {
    if (training) return;
    setTraining(true);
    setLossHist([]);
    setAccHist([]);
    setEpoch(-1);
    setModel(null);
    setError("");

    try {
      const dataset = await loadDiseaseDataset();
      const m = await trainModel({
        epochs: 36,
        dataset,
        onEpoch: (ep, loss, valAcc) => {
          setEpoch(ep);
          setLossHist((h) => [...h, loss]);
          setAccHist((h) => [...h, valAcc]);
        },
      });

      setModel(m);
      onTrained(m);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Training could not start.");
    } finally {
      setTraining(false);
    }
  };

  return (
    <section className="dark-grid border-y border-pine py-20 text-paper">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-8">
          <p className="font-mono text-xs font-bold tracking-widest text-mint">TRAINING GROUNDS</p>
          <h2 className="mt-2 font-display text-4xl font-black tracking-tight sm:text-5xl">
            Live SGD training in your browser<span className="text-mint">.</span>
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-paper/60">
            Trains a multinomial logistic model on the bundled Kaggle training rows. Identical symptom
            profiles stay together in a deterministic, per-disease holdout so duplicate rows cannot leak
            across the split. No synthetic rows are created.
          </p>
          <p className="mt-3 max-w-3xl border-l-2 border-mint/50 bg-paper/5 px-3 py-2 text-xs leading-relaxed text-paper/70">
            Standalone learning sandbox: this trained model does not power the Symptom Lab. Its scores describe
            performance on this dataset split and do not validate the symptom report.
          </p>
          <details className="mt-4 max-w-3xl border border-mint/20 bg-pine/70 px-4 py-3 text-xs leading-relaxed text-paper/65">
            <summary className="cursor-pointer font-mono font-bold tracking-wide text-mint">
              Dataset card · source, labels, split, and limitations
            </summary>
            <div className="mt-3 grid gap-x-8 gap-y-3 sm:grid-cols-2">
              <p>
                <strong className="text-paper">Source and license:</strong> Disease Symptom Prediction by
                Pranay Patil, bundled as <code>Training.csv</code>. The source lists CC BY-SA 4.0; attribution
                and license details are in the <a className="underline decoration-mint/60 underline-offset-2" href={`${import.meta.env.BASE_URL}DATASET-NOTICE.md`}>dataset notice</a>.
              </p>
              <p>
                <strong className="text-paper">Rows and labels:</strong> 4,920 examples across 41 source
                <code>prognosis</code> labels. Each label is the dataset's target category, not a confirmed
                patient diagnosis or outcome.
              </p>
              <p>
                <strong className="text-paper">Features:</strong> 131 unique symptom indicators encoded as
                binary values. Repeated header names are normalized and collapsed; the feature values are not
                laboratory measurements or clinical observations with validated definitions.
              </p>
              <p>
                <strong className="text-paper">Evaluation split:</strong> deterministic 80/20 holdout of unique
                symptom profiles within each label; identical profiles stay together. After training, the panel
                reports source rows, unique profiles, and grouped holdout support. This is an internal dataset
                split, not an independent clinical test set.
              </p>
              <p className="sm:col-span-2">
                <strong className="text-paper">Known gaps and intended use:</strong> this curated teaching
                dataset is not a verified cohort of real patients and does not establish representativeness,
                calibration, or clinical performance. It lacks validated patient-level context such as age,
                sex, setting, and outcome follow-up. Use the trainer only to learn about fitting and evaluating
                a classifier; do not use its output for healthcare decisions.
              </p>
            </div>
          </details>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex h-full flex-col border border-mint/25 bg-pine p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-mono text-[10px] font-bold tracking-[0.22em] text-mint/70">
                TRAINER · SGD + SOFTMAX CE
                <span className="block text-[9px] font-normal tracking-widest text-paper/40">
                  Disease Symptom Prediction · 41 labels · 131 unique symptom features
                </span>
              </p>
              <button
                onClick={train}
                disabled={training}
                className={`inline-flex items-center gap-2 px-4 py-2 font-display text-xs font-extrabold uppercase tracking-wider transition-all duration-200 ${
                  training
                    ? "cursor-wait border border-mint/30 bg-mint/10 text-mint/60"
                    : "bg-mint text-pine shadow-[4px_4px_0_0_rgba(143,227,207,0.25)] hover:-translate-y-0.5"
                }`}
              >
                {training ? (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 spin-slow">
                      <path d="m12 3 9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5" />
                    </svg>
                    Epoch {epoch + 1}/36
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                      <path d="M9 3h6M10 3v5l-6 10a2 2 0 0 0 1.8 3h12.4A2 2 0 0 0 20 18L14 8V3M7.5 14h9" />
                    </svg>
                    {model ? "Retrain" : "Train live"}
                  </>
                )}
              </button>
            </div>

            <div className="mt-4 border border-mint/15 bg-pinedeep p-3">
              <div className="mb-2 flex items-center justify-between font-mono text-[9px] tracking-[0.18em] text-paper/45">
                <span>
                  <span className="mr-1 inline-block h-1.5 w-3 bg-alert" /> LOSS
                  <span className="mx-2 mr-1 inline-block h-1.5 w-3 bg-mint" /> GROUPED HOLDOUT ACC
                </span>
                <span className="tabular-nums text-mint">
                {model ? `${model.sourceRows.toLocaleString()} source rows · ${model.metrics.testProfiles} heldout profiles` : "dataset loads on run"}
                </span>
              </div>
              <svg viewBox="0 0 320 110" className="h-28 w-full" preserveAspectRatio="none">
                {[0.25, 0.5, 0.75].map((g) => (
                  <line key={g} x1="8" x2="312" y1={110 - 12 - g * 84} y2={110 - 12 - g * 84} stroke="rgba(143,227,207,0.12)" strokeDasharray="3 4" />
                ))}
                {lossHist.length > 1 && (
                  <path
                    d={lossHist.map((v, i) => `${i === 0 ? "M" : "L"}${(i / (lossHist.length - 1)) * 304 + 8} ${110 - 12 - (v / Math.max(...lossHist)) * 84}`).join(" ")}
                    fill="none"
                    stroke="#c7463c"
                    strokeWidth="2"
                  />
                )}
                {accHist.length > 1 && (
                  <path
                    d={accHist.map((v, i) => `${i === 0 ? "M" : "L"}${(i / (accHist.length - 1)) * 304 + 8} ${110 - 12 - v * 84}`).join(" ")}
                    fill="none"
                    stroke="#8fe3cf"
                    strokeWidth="2"
                  />
                )}
              </svg>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {model
                ? [
                    { k: "ACCURACY", v: model.metrics.accuracy },
                    { k: "PRECISION", v: model.metrics.macroPrecision },
                    { k: "RECALL", v: model.metrics.macroRecall },
                    { k: "F1 (MACRO)", v: model.metrics.macroF1 },
                  ].map((m) => (
                    <div key={m.k} className="border border-mint/20 bg-paper/5 p-2.5 text-center">
                      <p className="font-mono text-[8px] tracking-[0.18em] text-paper/45">{m.k}</p>
                      <p className="mt-1 font-display text-xl font-black tabular-nums text-mint">
                        {(m.v * 100).toFixed(1)}%
                      </p>
                    </div>
                  ))
                : Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="border border-dashed border-mint/15 p-2.5 text-center">
                      <p className="font-mono text-[8px] tracking-[0.18em] text-paper/25">— · —</p>
                    </div>
                  ))}
            </div>
            {error && <p role="alert" className="mt-3 border border-alert/50 bg-alert/10 px-3 py-2 font-mono text-xs text-paper">{error}</p>}
            {model && (
              <p className="mt-3 font-mono text-[9px] leading-relaxed text-paper/45">
                {model.trainingRows.toLocaleString()} training rows · {model.metrics.testRows.toLocaleString()} grouped holdout rows · {model.uniqueProfiles.toLocaleString()} unique symptom profiles · {(model.sourceRows - model.uniqueProfiles).toLocaleString()} repeated rows · dataset scores are educational only.
              </p>
            )}
          </div>

          <div className="flex h-full flex-col gap-4">
            <div className="min-h-0 flex-1 border border-mint/25 bg-pine p-5">
              <p className="mb-3 font-mono text-[10px] font-bold tracking-[0.22em] text-mint/70">
                GROUPED HOLDOUT · TOP 6 BY F1
              </p>
              {model ? (
                <table className="w-full font-mono text-[11px]">
                  <thead>
                    <tr className="text-left text-[9px] tracking-[0.18em] text-paper/40">
                      <th className="pb-1.5">DISEASE</th>
                      <th className="pb-1.5 text-right">P</th>
                      <th className="pb-1.5 text-right">R</th>
                      <th className="pb-1.5 text-right">F1</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...model.metrics.perClass]
                      .sort((a, b) => b.f1 - a.f1)
                      .slice(0, 6)
                      .map((c) => (
                        <tr key={c.name} className="border-t border-mint/10 transition-colors hover:bg-mint/5">
                          <td className="py-1.5 pr-2 text-paper/85">{c.name}</td>
                          <td className="py-1.5 text-right tabular-nums text-mint/90">{(c.precision * 100).toFixed(0)}</td>
                          <td className="py-1.5 text-right tabular-nums text-mint/90">{(c.recall * 100).toFixed(0)}</td>
                          <td className="py-1.5 text-right font-bold tabular-nums text-mint">{(c.f1 * 100).toFixed(0)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              ) : (
                <p className="py-6 text-center font-mono text-[11px] text-paper/35">
                  metrics appear after the first training run
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
