import { useState } from "react";
import { CONFUSION, FAQS, MODEL_CARDS, SAMPLE_DATASET, TRAINING_STEPS } from "../data/medical";
import { CountUp, ECGLine, Icon, Reveal, SectionTag } from "./ui";

/* ---------- inside the model: sticky two-column ---------- */

export function InsideModel() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        {/* sticky narrative */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <Reveal>
            <SectionTag>Model internals</SectionTag>
            <h2 className="mt-4 font-display text-4xl font-black leading-[0.95] tracking-tight sm:text-5xl">
              From pixels
              <br />
              to <span className="text-teal">prognosis</span>
              <span className="text-alert">.</span>
            </h2>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-inksoft">
              Every study follows the same six-step pipeline a production radiology model uses: decode,
              resize, normalize, convolve, classify, explain. The CNN on the right is the exact Keras
              architecture this console simulates — small enough to train on a laptop, honest enough to
              teach the whole journey.
            </p>
            <div className="mt-6 flex items-center gap-4 border-l-2 border-alert pl-4">
              <p className="font-mono text-[11px] leading-relaxed text-inksoft">
                <span className="font-bold text-alert">WHY ÷255?</span>
                <br />
                Normalized pixels ⇒ well-conditioned gradients ⇒ faster convergence, fewer epochs.
              </p>
            </div>
            <ECGLine className="mt-8 h-10 w-full text-teal" slow />
          </Reveal>
        </div>

        {/* steps */}
        <div className="space-y-4">
          {TRAINING_STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 60}>
              <div className="group border border-ink/15 bg-paper p-4 transition-all duration-300 hover:-translate-y-1 hover:border-teal hover:shadow-[6px_6px_0_0_rgba(14,124,114,0.2)]">
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-2xl font-black text-teal/35 transition-colors group-hover:text-teal">
                    {s.n}
                  </span>
                  <h3 className="font-display text-base font-extrabold">{s.title}</h3>
                </div>
                <p className="mt-2 overflow-x-auto whitespace-nowrap border border-pine bg-pine px-3 py-2 font-mono text-xs text-mint">
                  <span className="select-none text-mint/40">$ </span>
                  {s.code}
                </p>
                <p className="mt-2 text-[13px] leading-relaxed text-inksoft">{s.note}</p>
              </div>
            </Reveal>
          ))}

          <Reveal delay={120}>
            <div className="border-2 border-ink bg-pine p-5 shadow-[8px_8px_0_0_rgba(12,43,43,0.9)]">
              <p className="mb-3 flex items-center justify-between font-mono text-[10px] tracking-[0.22em] text-mint/60">
                <span>train.py — the whole network</span>
                <span className="blink-soft text-mint">▮▮▮</span>
              </p>
              <pre className="overflow-x-auto font-mono text-[12px] leading-relaxed text-mint/90">
{`model = Sequential([
  Conv2D(32, (3,3), activation="relu"),
  MaxPooling2D((2,2)),
  Conv2D(64, (3,3), activation="relu"),
  MaxPooling2D((2,2)),
  Flatten(),
  Dense(128, activation="relu"),
  Dense(2, activation="softmax")
])

model.compile(optimizer="adam",
  loss="categorical_crossentropy",
  metrics=["accuracy"])

model.fit(X_train, y_train, epochs=10,
  validation_data=(X_test, y_test))`}
              </pre>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ---------- evaluation ---------- */

export function Evaluation() {
  const total = CONFUSION.tp + CONFUSION.fp + CONFUSION.fn + CONFUSION.tn;
  const metrics = [
    { label: "Accuracy", v: ((CONFUSION.tp + CONFUSION.tn) / total) * 100, cls: "bg-teal" },
    { label: "Precision", v: (CONFUSION.tp / (CONFUSION.tp + CONFUSION.fp)) * 100, cls: "bg-ink" },
    { label: "Recall", v: (CONFUSION.tp / (CONFUSION.tp + CONFUSION.fn)) * 100, cls: "bg-alert" },
  ];

  return (
    <section className="dark-grid border-y border-pine py-20 text-paper">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal>
          <SectionTag tone="alert">Model evaluation</SectionTag>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-4xl font-black tracking-tight sm:text-5xl">
              The confusion
              <br />
              matrix <span className="text-mint">never lies.</span>
            </h2>
            <p className="max-w-sm text-sm leading-relaxed text-paper/60">
              PneumoNet v3 on 1,000 held-out chest studies. One missed pneumonia costs more than ten
              unnecessary reviews — so recall leads the dashboard.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_1.15fr]">
          {/* matrix */}
          <Reveal>
            <div className="mx-auto max-w-md">
              <div className="grid grid-cols-[auto_1fr_1fr] gap-px bg-mint/20">
                <div className="bg-pine p-3" />
                <div className="bg-pine p-3 text-center font-mono text-[10px] font-bold tracking-widest text-mint/70">
                  PRED: PNEUMONIA
                </div>
                <div className="bg-pine p-3 text-center font-mono text-[10px] font-bold tracking-widest text-mint/70">
                  PRED: NORMAL
                </div>
                <div className="flex items-center justify-center bg-pine p-3 font-mono text-[10px] font-bold tracking-widest text-mint/70 [writing-mode:vertical-rl] rotate-180">
                  TRUE: PNEUMONIA
                </div>
                <div className="group bg-teal/25 p-6 text-center transition-colors hover:bg-teal/40">
                  <CountUp value={CONFUSION.tp} className="font-display text-4xl font-black text-mint" />
                  <p className="mt-1 font-mono text-[10px] tracking-widest text-mint/70">TP · CAUGHT</p>
                </div>
                <div className="group bg-alert/25 p-6 text-center transition-colors hover:bg-alert/40">
                  <CountUp value={CONFUSION.fn} className="font-display text-4xl font-black text-alert" />
                  <p className="mt-1 font-mono text-[10px] tracking-widest text-alert/80">FN · MISSED ⚠</p>
                </div>
                <div className="flex items-center justify-center bg-pine p-3 font-mono text-[10px] font-bold tracking-widest text-mint/70 [writing-mode:vertical-rl] rotate-180">
                  TRUE: NORMAL
                </div>
                <div className="group bg-amber/20 p-6 text-center transition-colors hover:bg-amber/35">
                  <CountUp value={CONFUSION.fp} className="font-display text-4xl font-black text-amber" />
                  <p className="mt-1 font-mono text-[10px] tracking-widest text-amber/80">FP · OVERCALL</p>
                </div>
                <div className="group bg-teal/25 p-6 text-center transition-colors hover:bg-teal/40">
                  <CountUp value={CONFUSION.tn} className="font-display text-4xl font-black text-mint" />
                  <p className="mt-1 font-mono text-[10px] tracking-widest text-mint/70">TN · CLEARED</p>
                </div>
              </div>
            </div>
          </Reveal>

          {/* metric bars + model cards */}
          <Reveal delay={120}>
            <div className="space-y-6">
              {metrics.map((m, i) => (
                <div key={m.label}>
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="font-mono text-xs tracking-[0.2em] text-paper/70">{m.label.toUpperCase()}</span>
                    <CountUp value={m.v} decimals={1} suffix="%" className="font-mono text-lg font-bold text-mint" />
                  </div>
                  <div className="h-3 bg-paper/10">
                    <div className={`bar-fill h-full ${m.cls}`} style={{ width: `${m.v}%`, animationDelay: `${i * 150}ms` }} />
                  </div>
                </div>
              ))}

              <div className="grid gap-3 pt-2 sm:grid-cols-2">
                {MODEL_CARDS.map((m) => (
                  <div key={m.name} className="border border-mint/20 bg-paper/5 p-4 transition-colors hover:border-mint/50">
                    <p className="font-display text-sm font-extrabold text-paper">{m.name}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-paper/50">{m.arch}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-paper/50">{m.dataset}</p>
                    <p className="mt-2 font-mono text-[10px] tracking-widest text-mint/80">
                      P {m.prec} · R {m.rec} · F1 {m.f1}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ---------- field notes: FAQ + dataset ---------- */

export function FieldNotes() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <Reveal>
            <SectionTag tone="ink">Interview drill</SectionTag>
            <h2 className="mt-4 font-display text-4xl font-black tracking-tight sm:text-5xl">
              Defend the
              <br />
              architecture<span className="text-teal">.</span>
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-inksoft">
              Four questions every medical-AI interview circles back to. Expand each — these are the
              answers your model should be able to give about itself.
            </p>
          </Reveal>

          <div className="mt-8 space-y-2.5">
            {FAQS.map((f, i) => {
              const isOpen = open === i;
              return (
                <Reveal key={f.q} delay={i * 70}>
                  <div className={`border transition-all duration-300 ${isOpen ? "border-teal shadow-[5px_5px_0_0_rgba(14,124,114,0.25)]" : "border-ink/15 hover:border-ink/40"}`}>
                    <button
                      onClick={() => setOpen(isOpen ? null : i)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left"
                    >
                      <span className="font-display text-sm font-extrabold sm:text-base">{f.q}</span>
                      <span
                        className={`grid h-7 w-7 shrink-0 place-items-center border font-mono text-base font-bold transition-transform duration-300 ${
                          isOpen ? "rotate-45 border-teal bg-teal text-paper" : "border-ink/25 text-ink"
                        }`}
                      >
                        +
                      </span>
                    </button>
                    <div
                      className="grid transition-[grid-template-rows] duration-300 ease-out"
                      style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                    >
                      <div className="overflow-hidden">
                        <p className="border-t border-dashed border-ink/15 px-4 py-3.5 text-[13.5px] leading-relaxed text-inksoft">
                          {f.a}
                        </p>
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>

        {/* dataset table */}
        <div>
          <Reveal delay={100}>
            <SectionTag>Training data</SectionTag>
            <h3 className="mt-4 font-display text-2xl font-black tracking-tight">
              The symptom table<span className="text-alert">.</span>
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-inksoft">
              Before images, the model learns from a tabular toy set — binary symptom features mapped to
              labels. The same one-hot logic powers the Symptom Lab above.
            </p>
            <div className="mt-6 overflow-x-auto border-2 border-ink bg-paper shadow-[6px_6px_0_0_rgba(12,43,43,0.85)]">
              <table className="w-full min-w-[400px] font-mono text-xs">
                <thead>
                  <tr className="bg-ink text-paper">
                    {["fever", "cough", "headache", "disease"].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left font-semibold tracking-widest">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SAMPLE_DATASET.map((r, i) => (
                    <tr
                      key={i}
                      className={`border-t border-ink/10 transition-colors hover:bg-teal/10 ${i % 2 ? "bg-paperdeep/50" : ""}`}
                    >
                      <td className="px-4 py-2.5 tabular-nums">{r.fever}</td>
                      <td className="px-4 py-2.5 tabular-nums">{r.cough}</td>
                      <td className="px-4 py-2.5 tabular-nums">{r.headache}</td>
                      <td className="px-4 py-2.5 font-bold text-teal">{r.disease}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 flex items-start gap-2 font-mono text-[11px] leading-relaxed text-inksoft/80">
              <Icon name="warn" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber" />
              Real deployments train on thousands of labelled records with clinician review — never a
              six-row table. This one exists so the math stays visible.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
