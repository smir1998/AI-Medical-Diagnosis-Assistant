import { useEffect, useRef, useState } from "react";
import { DATASET_SOURCE, REAL_DATASETS, CONSOLE_TO_VOCAB } from "../data/diseaseSymptomDataset";
import { SYMPTOMS } from "../data/medical";
import { predictWithModel, trainModel, type Prediction, type TrainedModel } from "../lib/train";
import { prefersReducedMotion, sleep } from "../lib/engine";
import { Icon, Reveal, SectionTag } from "./ui";

interface Props {
  onTrained: (m: TrainedModel) => void;
}

const TRAINABLE = SYMPTOMS.filter((s) => CONSOLE_TO_VOCAB[s.id] !== null);

export function TrainingGrounds({ onTrained }: Props) {
  const [model, setModel] = useState<TrainedModel | null>(null);
  const [training, setTraining] = useState(false);
  const [epoch, setEpoch] = useState(-1);
  const [lossHist, setLossHist] = useState<number[]>([]);
  const [accHist, setAccHist] = useState<number[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set(["vomiting", "diarrhea"]));
  const [preds, setPreds] = useState<Prediction[] | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const train = async () => {
    if (training) return;
    setTraining(true);
    setPreds(null);
    setLossHist([]);
    setAccHist([]);
    setEpoch(-1);
    const reduced = prefersReducedMotion();
    const m = await trainModel({
      epochs: 36,
      onEpoch: (ep, loss, valAcc) => {
        setEpoch(ep);
        setLossHist((h) => [...h, loss]);
        setAccHist((h) => [...h, valAcc]);
      },
      yield: reduced ? undefined : () => sleep(26),
    });
    if (!alive.current) return;
    setModel(m);
    onTrained(m);
    setTraining(false);
  };

  const runInference = () => {
    if (!model || picked.size === 0) return;
    setPreds(predictWithModel(model, [...picked]));
  };

  /* loss curve geometry */
  const W = 320;
  const H = 110;
  const toPath = (vals: number[], invert = false) => {
    if (vals.length < 2) return "";
    const maxL = Math.max(...lossHist, 0.001);
    return vals
      .map((v, i) => {
        const x = (i / (vals.length - 1)) * (W - 16) + 8;
        const norm = invert ? v : v / maxL;
        const y = H - 12 - norm * (H - 26);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  };

  const finalAcc = model?.metrics.accuracy ?? (accHist.length ? accHist[accHist.length - 1] : 0);

  return (
    <section className="dark-grid border-y border-pine py-20 text-paper">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal>
          <SectionTag>Training grounds</SectionTag>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-4xl font-black tracking-tight sm:text-5xl">
              Real data.
              <br />
              <span className="text-mint">Measured accuracy.</span>
            </h2>
            <p className="max-w-md text-sm leading-relaxed text-paper/60">
              No invented numbers here: a real multinomial logistic head trains live in your browser on
              the disease–symptom associations from the public Kaggle dataset, and every metric below is{" "}
              <span className="font-semibold text-paper">computed on a held-out test split</span>.
            </p>
          </div>
        </Reveal>

        {/* dataset strip */}
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {REAL_DATASETS.map((d, i) => (
            <Reveal key={d.name} delay={i * 70}>
              <a
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block h-full border border-mint/20 bg-paper/5 p-3.5 transition-all duration-300 hover:-translate-y-1 hover:border-mint/60 hover:bg-paper/10"
              >
                <p className="flex items-center justify-between gap-2 font-mono text-[9px] tracking-[0.2em] text-mint/60">
                  {d.head}
                  <span className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">↗</span>
                </p>
                <p className="mt-1.5 font-display text-sm font-extrabold leading-tight text-paper">{d.name}</p>
                <p className="mt-1 font-mono text-[10px] leading-relaxed text-paper/55">
                  {d.size} · {d.classes}
                </p>
              </a>
            </Reveal>
          ))}
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          {/* left: trainer + loss curve */}
          <Reveal>
            <div className="flex h-full flex-col border border-mint/25 bg-pine p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-mono text-[10px] font-bold tracking-[0.22em] text-mint/70">
                  TRAINER · SGD + SOFTMAX CE
                  <span className="block text-[9px] font-normal tracking-widest text-paper/40">
                    {DATASET_SOURCE.name} · {DATASET_SOURCE.note}
                  </span>
                </p>
                <button
                  onClick={train}
                  disabled={training}
                  className={`inline-flex items-center gap-2 px-4 py-2 font-display text-xs font-extrabold uppercase tracking-wider transition-all duration-200 ${
                    training
                      ? "cursor-wait border border-mint/30 bg-mint/10 text-mint/60"
                      : "bg-mint text-pine shadow-[4px_4px_0_0_rgba(143,227,207,0.25)] hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_rgba(143,227,207,0.3)] active:translate-y-0"
                  }`}
                >
                  {training ? (
                    <>
                      <Icon name="layers" className="h-3.5 w-3.5 spin-slow" /> Epoch {epoch + 1}/36
                    </>
                  ) : (
                    <>
                      <Icon name="flask" className="h-3.5 w-3.5" /> {model ? "Retrain" : "Train live"}
                    </>
                  )}
                </button>
              </div>

              {/* loss curve */}
              <div className="mt-4 border border-mint/15 bg-pinedeep p-3">
                <div className="mb-2 flex items-center justify-between font-mono text-[9px] tracking-[0.18em] text-paper/45">
                  <span>
                    <span className="mr-1 inline-block h-1.5 w-3 bg-alert" /> LOSS
                    <span className="mx-2 mr-1 inline-block h-1.5 w-3 bg-mint" /> TEST ACC
                  </span>
                  <span className="tabular-nums text-mint">
                    {training || model ? `acc ${(finalAcc * 100).toFixed(1)}%` : "awaiting run"}
                  </span>
                </div>
                <svg viewBox={`0 0 ${W} ${H}`} className="h-28 w-full" preserveAspectRatio="none" aria-hidden="true">
                  {[0.25, 0.5, 0.75].map((g) => (
                    <line key={g} x1="8" x2={W - 8} y1={H - 12 - g * (H - 26)} y2={H - 12 - g * (H - 26)} stroke="rgba(143,227,207,0.12)" strokeDasharray="3 4" />
                  ))}
                  {lossHist.length > 1 && (
                    <path d={toPath(lossHist)} fill="none" stroke="#c7463c" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                  )}
                  {accHist.length > 1 && (
                    <path d={toPath(accHist, true)} fill="none" stroke="#8fe3cf" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                  )}
                </svg>
              </div>

              {/* measured metrics */}
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

              <p className="mt-3 font-mono text-[9px] leading-relaxed tracking-wider text-paper/35">
                {model
                  ? `${model.trainRows} train / ${model.metrics.testRows} test rows · ${model.vocab.length}-dim one-hot · ${model.classes.length} classes · seed ${model.seed} (reproducible)`
                  : "75/25 split · mini-batch 32 · lr 0.5 decay · L2 1e-4 · deterministic seed"}
              </p>
            </div>
          </Reveal>

          {/* right: per-class table + inference from trained weights */}
          <Reveal delay={120}>
            <div className="flex h-full flex-col gap-4">
              <div className="min-h-0 flex-1 border border-mint/25 bg-pine p-5">
                <p className="mb-3 font-mono text-[10px] font-bold tracking-[0.22em] text-mint/70">
                  MEASURED PER-CLASS · TOP 6 BY F1
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

              {/* inference widget */}
              <div className="border border-mint/25 bg-pine p-5">
                <p className="mb-2 font-mono text-[10px] font-bold tracking-[0.22em] text-mint/70">
                  RUN THE TRAINED HEAD
                  <span className="block text-[9px] font-normal tracking-widest text-paper/40">
                    real weights · softmax over {model?.classes.length ?? 30} classes
                  </span>
                </p>
                <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto chat-scroll pr-1">
                  {TRAINABLE.map((s) => {
                    const on = picked.has(s.id);
                    return (
                      <button
                        key={s.id}
                        onClick={() => {
                          setPicked((prev) => {
                            const next = new Set(prev);
                            if (next.has(s.id)) next.delete(s.id);
                            else next.add(s.id);
                            return next;
                          });
                          setPreds(null);
                        }}
                        disabled={!model}
                        className={`border px-2 py-1 font-mono text-[10px] transition-all duration-200 disabled:opacity-35 ${
                          on
                            ? "border-mint bg-mint text-pine"
                            : "border-mint/25 text-paper/70 hover:border-mint/60 hover:text-mint"
                        }`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={runInference}
                  disabled={!model || picked.size === 0}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 bg-alert px-4 py-2.5 font-display text-xs font-extrabold uppercase tracking-wider text-paper transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <Icon name="brain" className="h-3.5 w-3.5" /> Forward pass
                </button>
                {preds && (
                  <div className="mt-3 space-y-2">
                    {preds.slice(0, 3).map((p, i) => (
                      <div key={p.name}>
                        <div className="mb-1 flex justify-between font-mono text-[10px]">
                          <span className={i === 0 ? "font-bold text-mint" : "text-paper/70"}>{p.name}</span>
                          <span className="tabular-nums text-mint">{(p.prob * 100).toFixed(1)}%</span>
                        </div>
                        <div className="h-1.5 bg-paper/10">
                          <div className={`bar-fill h-full ${i === 0 ? "bg-mint" : "bg-mint/40"}`} style={{ width: `${Math.max(2, p.prob * 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
