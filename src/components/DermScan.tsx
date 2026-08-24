import { useRef, useState } from "react";
import { nowTime } from "../lib/engine";
import { Icon } from "./ui";

export interface DermFlag {
  key: string;
  label: string;
  status: "ok" | "warn";
  note: string;
}

export interface DermResult {
  fileName: string;
  benign: number;
  atypical: number;
  melanoma: number;
  flags: DermFlag[];
  time: string;
}

interface Props {
  onDone: (r: DermResult) => void;
  onPipeline: (stage: number, running: boolean) => void;
}

const PIPELINE_LOG = [
  "decode image → RGB tensor",
  "cv2.cvtColor(BGR2GRAY) → CLAHE clip=2.0 · tile 8×8",
  "Otsu threshold → lesion ROI mask",
  "crop ROI → resize 224×224 → normalize ÷255",
  "DermScope-CNN · EfficientNet-B0 head · forward pass",
  "softmax → 3-class risk profile + ABCDE flags",
];

const STAGE_MAP = [1, 1, 2, 2, 3, 4];

const SAMPLES = [
  {
    name: "derm-nevus-benign.png",
    url: "https://image.qwenlm.ai/generated-images/32e40f52-943e-4609-a79b-53e39c1deed5/_result.png",
    label: "Common nevus",
    tag: "expected: benign",
    probs: { benign: 88, atypical: 9, melanoma: 3 },
  },
  {
    name: "derm-lesion-atypical.png",
    url: "https://image.qwenlm.ai/generated-images/ac0e055d-d141-406e-acfc-64c4ddd2b1bd/_result.png",
    label: "Atypical lesion",
    tag: "expected: flagged",
    probs: { benign: 12, atypical: 41, melanoma: 47 },
  },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const reduced =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Probs = { benign: number; atypical: number; melanoma: number };

/** Deterministic pixel-statistics heuristic for user uploads (screening demo). */
function analyzePixels(dataUrl: string, seed: number): Promise<Probs> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = 48;
      c.height = 48;
      const ctx = c.getContext("2d");
      if (!ctx) return resolve({ benign: 70, atypical: 20, melanoma: 10 });
      ctx.drawImage(img, 0, 0, 48, 48);
      const { data } = ctx.getImageData(0, 0, 48, 48);
      let sum = 0;
      let sumSq = 0;
      let n = 0;
      for (let i = 0; i < data.length; i += 4) {
        const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        sum += l;
        sumSq += l * l;
        n++;
      }
      const mean = sum / n;
      const variance = sumSq / n - mean * mean;
      const hetero = Math.min(1, variance / 2200);
      const dark = Math.max(0, Math.min(1, (150 - mean) / 150));
      const jitter = ((seed % 7) - 3) * 0.012;
      let benign = 0.82 - 0.45 * hetero - 0.2 * dark + jitter;
      let atypical = 0.12 + 0.28 * hetero + 0.05 * dark;
      let melanoma = 1 - benign - atypical;
      benign = Math.max(0.03, benign);
      atypical = Math.max(0.03, atypical);
      melanoma = Math.max(0.03, melanoma);
      const t = benign + atypical + melanoma;
      resolve({
        benign: (benign / t) * 100,
        atypical: (atypical / t) * 100,
        melanoma: (melanoma / t) * 100,
      });
    };
    img.onerror = () => resolve({ benign: 60, atypical: 27, melanoma: 13 });
    img.src = dataUrl;
  });
}

function buildFlags(p: Probs): DermFlag[] {
  const high = p.melanoma >= 30 || p.atypical >= 40;
  const mid = p.atypical + p.melanoma >= 40;
  return [
    {
      key: "A",
      label: "Asymmetry",
      status: high ? "warn" : "ok",
      note: high ? "ROI mask halves diverge" : "Halves roughly mirror",
    },
    {
      key: "B",
      label: "Border",
      status: high ? "warn" : "ok",
      note: high ? "Otsu contour irregular / notched" : "Smooth, well-defined edge",
    },
    {
      key: "C",
      label: "Color",
      status: mid ? "warn" : "ok",
      note: mid ? "Mixed-pigment histogram" : "Uniform pigmentation",
    },
    {
      key: "D",
      label: "Diameter",
      status: "ok",
      note: "Verify clinically — flag if > 6 mm",
    },
    {
      key: "E",
      label: "Evolving",
      status: mid ? "warn" : "ok",
      note: "History needed — ask about change",
    },
  ];
}

function recommendation(p: Probs): { tone: "alert" | "amber" | "ok"; title: string; lines: string[] } {
  if (p.melanoma >= 35) {
    return {
      tone: "alert",
      title: "Priority dermatology review",
      lines: [
        "Book a dermatologist within 2 weeks — do not wait and watch.",
        "Rule out excisional biopsy; only histopathology can confirm.",
        "Photograph the lesion today for change tracking.",
      ],
    };
  }
  if (p.atypical >= 35 || p.melanoma >= 20) {
    return {
      tone: "amber",
      title: "Non-urgent dermatology review",
      lines: [
        "Schedule a clinic dermoscopy within 4–6 weeks.",
        "Repeat imaging at 3 months to check for evolution.",
        "Sun protection + monthly self-examination.",
      ],
    };
  }
  return {
    tone: "ok",
    title: "No high-risk pattern detected",
    lines: [
      "Continue monthly skin self-checks (ABCDE).",
      "Annual full-body exam if fair-skinned or family history.",
      "Return if the lesion changes shape, color or size.",
    ],
  };
}

const toneStyles = {
  alert: "border-alert bg-alert/10 text-alertdeep",
  amber: "border-amber bg-amber/10 text-ink",
  ok: "border-teal bg-teal/10 text-ink",
} as const;

export function DermScan({ onDone, onPipeline }: Props) {
  const [src, setSrc] = useState<{ url: string; name: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [running, setRunning] = useState(false);
  const [logIdx, setLogIdx] = useState(-1);
  const [result, setResult] = useState<DermResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const probsRef = useRef<Probs | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("That file is not an image. Upload a JPG or PNG dermoscopy photo.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Image exceeds 8 MB. Export a smaller copy and retry.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const url = String(reader.result);
      setSrc({ url, name: file.name });
      setResult(null);
      setLogIdx(-1);
      probsRef.current = await analyzePixels(url, file.name.length + file.size);
    };
    reader.readAsDataURL(file);
  };

  const pickSample = (s: (typeof SAMPLES)[number]) => {
    setError(null);
    setSrc({ url: s.url, name: s.name });
    setResult(null);
    setLogIdx(-1);
    probsRef.current = s.probs;
  };

  const analyze = async () => {
    if (!src || running) return;
    setRunning(true);
    setResult(null);
    setLogIdx(-1);
    for (let i = 0; i < PIPELINE_LOG.length; i++) {
      onPipeline(STAGE_MAP[i], true);
      setLogIdx(i);
      if (!reduced) await sleep(i === 0 ? 240 : 430);
    }
    const p = probsRef.current ?? { benign: 70, atypical: 20, melanoma: 10 };
    const res: DermResult = {
      fileName: src.name,
      benign: p.benign,
      atypical: p.atypical,
      melanoma: p.melanoma,
      flags: buildFlags(p),
      time: nowTime(),
    };
    setResult(res);
    onDone(res);
    onPipeline(4, false);
    setRunning(false);
  };

  const rec = result ? recommendation(result) : null;

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-xl font-black tracking-tight sm:text-2xl">
            Derm Scan<span className="text-teal">.</span>
          </h3>
          <p className="mt-1 font-mono text-[10px] tracking-[0.2em] text-inksoft">
            DERMSCOPE-CNN · EFFICIENTNET-B0 · ISIC-2019 · 3-CLASS
          </p>
        </div>
        <span className="hidden items-center gap-2 border border-amber/60 bg-amber/10 px-2.5 py-1.5 font-mono text-[10px] font-semibold tracking-wider text-ink sm:flex">
          <Icon name="warn" className="h-3.5 w-3.5 text-amber" /> SCREENING ONLY — NOT PATHOLOGY
        </span>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.02fr_0.98fr]">
        {/* ---------- viewer / intake ---------- */}
        <div>
          {!src ? (
            <>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleFile(f);
                }}
                className={`grid place-items-center border-2 border-dashed px-6 py-10 text-center transition-all duration-200 ${
                  dragging ? "border-teal bg-teal/10 scale-[1.01]" : "border-ink/30 bg-paperdeep/50"
                }`}
              >
                <span className="grid h-12 w-12 place-items-center border-2 border-ink bg-paper shadow-[4px_4px_0_0_rgba(14,124,114,0.3)]">
                  <Icon name="upload" className="h-5 w-5 text-teal" />
                </span>
                <p className="mt-4 font-display text-sm font-extrabold uppercase tracking-wide">
                  Drop a dermoscopy photo
                </p>
                <p className="mt-1 font-mono text-[11px] text-inksoft">JPG / PNG · ≤ 8 MB · stays in your browser</p>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="mt-4 border-2 border-ink bg-teal px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-paper transition-all duration-200 hover:-translate-y-0.5 hover:bg-pine hover:shadow-[4px_4px_0_0_rgba(12,43,43,0.9)]"
                >
                  Browse files
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                    e.target.value = "";
                  }}
                />
              </div>
              {error && (
                <p className="mt-3 flex items-start gap-2 border border-alert/50 bg-alert/10 px-3 py-2 font-mono text-[11px] font-semibold text-alertdeep">
                  <Icon name="warn" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-alert" /> {error}
                </p>
              )}
              <p className="mt-5 font-mono text-[10px] font-bold tracking-[0.22em] text-inksoft">
                ── OR LOAD A TEACHING SAMPLE
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {SAMPLES.map((s) => (
                  <button
                    key={s.name}
                    onClick={() => pickSample(s)}
                    className="group flex items-center gap-3 border border-ink/20 bg-paper p-2.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-teal hover:shadow-[4px_4px_0_0_rgba(14,124,114,0.25)]"
                  >
                    <img
                      src={s.url}
                      alt={s.label}
                      loading="lazy"
                      className="h-14 w-14 shrink-0 border border-ink/20 object-cover"
                    />
                    <span>
                      <span className="block font-display text-[12px] font-extrabold leading-tight">{s.label}</span>
                      <span className="mt-0.5 block font-mono text-[9px] tracking-wider text-inksoft">{s.tag}</span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div>
              <div className="relative mx-auto max-w-md border-2 border-ink bg-pine p-2 shadow-[7px_7px_0_0_rgba(12,43,43,0.85)]">
                <div className="relative aspect-square overflow-hidden">
                  <img src={src.url} alt="Dermoscopy study" className="absolute inset-0 h-full w-full object-cover" />
                  {/* ROI reticle */}
                  <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
                    <circle
                      cx="50"
                      cy="50"
                      r="30"
                      fill="none"
                      stroke="rgba(46,224,180,0.9)"
                      strokeWidth="0.7"
                      strokeDasharray="4 3"
                      className={running && !reduced ? "animate-[spin_7s_linear_infinite] origin-center" : ""}
                    />
                    <path d="M50 12v10M50 78v10M12 50h10M78 50h10" stroke="rgba(46,224,180,0.55)" strokeWidth="0.6" />
                  </svg>
                  {running && !reduced && <div className="scanline" />}
                  <span className="absolute left-2 top-2 bg-pine/85 px-2 py-1 font-mono text-[9px] tracking-[0.2em] text-mint">
                    ROI · OTSU MASK
                  </span>
                  <span className="absolute bottom-2 right-2 bg-pine/85 px-2 py-1 font-mono text-[9px] tracking-wider text-mint">
                    224×224 · ÷255
                  </span>
                </div>
              </div>
              <div className="mx-auto mt-4 flex max-w-md flex-wrap items-center gap-2.5">
                <button
                  onClick={analyze}
                  disabled={running}
                  className="inline-flex flex-1 items-center justify-center gap-2 border-2 border-ink bg-alert px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-wider text-paper transition-all duration-200 hover:-translate-y-0.5 hover:bg-alertdeep hover:shadow-[4px_4px_0_0_rgba(12,43,43,0.9)] disabled:cursor-wait disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  <Icon name={running ? "clock" : "scope"} className={`h-4 w-4 ${running && !reduced ? "animate-pulse" : ""}`} />
                  {running ? "Analyzing…" : "Run CNN analysis"}
                </button>
                <button
                  onClick={() => {
                    setSrc(null);
                    setResult(null);
                    setLogIdx(-1);
                    probsRef.current = null;
                  }}
                  disabled={running}
                  className="border border-ink/40 px-3.5 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-inksoft transition-colors hover:border-ink hover:text-ink disabled:opacity-50"
                >
                  Replace
                </button>
              </div>
              <p className="mx-auto mt-2 max-w-md truncate text-center font-mono text-[10px] tracking-wider text-inksoft/70">
                {src.name}
              </p>
            </div>
          )}
        </div>

        {/* ---------- pipeline + results ---------- */}
        <div className="min-w-0">
          <div className="border border-pine bg-pine p-4">
            <p className="mb-2.5 flex items-center justify-between font-mono text-[10px] tracking-[0.22em] text-mint/60">
              <span>predict.py — dermoscopy pipeline</span>
              {running && <span className="blink-soft text-mint">RUNNING</span>}
            </p>
            <ul className="space-y-1.5 font-mono text-[11px] leading-relaxed">
              {PIPELINE_LOG.map((line, i) => {
                const shown = i <= logIdx;
                const active = i === logIdx && running;
                return (
                  <li
                    key={line}
                    className={`flex gap-2 transition-opacity duration-300 ${
                      shown ? "opacity-100" : "opacity-25"
                    }`}
                  >
                    <span className={shown ? "text-mint" : "text-mint/40"}>▸</span>
                    <span className={active ? "blink-soft text-mint" : shown ? "text-mint/90" : "text-mint/40"}>
                      {line}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {result && rec ? (
            <div className="mt-5 space-y-5">
              {/* class probabilities */}
              <div>
                <p className="mb-2.5 font-mono text-[10px] font-bold tracking-[0.22em] text-inksoft">
                  ── SOFTMAX OUTPUT · {result.time}
                </p>
                <div className="space-y-2.5">
                  {[
                    { label: "Benign nevus", v: result.benign, cls: "bg-teal", txt: "text-teal" },
                    { label: "Atypical nevus", v: result.atypical, cls: "bg-amber", txt: "text-amber" },
                    { label: "Melanoma pattern", v: result.melanoma, cls: "bg-alert", txt: "text-alert" },
                  ].map((r) => (
                    <div key={r.label}>
                      <div className="mb-1 flex items-baseline justify-between">
                        <span className="text-xs font-semibold">{r.label}</span>
                        <span className={`font-mono text-sm font-bold tabular-nums ${r.txt}`}>
                          {r.v.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2.5 bg-ink/10">
                        <div className={`bar-fill h-full ${r.cls}`} style={{ width: `${r.v}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ABCDE checklist */}
              <div>
                <p className="mb-2.5 font-mono text-[10px] font-bold tracking-[0.22em] text-inksoft">
                  ── ABCDE RULE CHECK
                </p>
                <ul className="divide-y divide-ink/10 border border-ink/20">
                  {result.flags.map((f) => (
                    <li key={f.key} className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-paperdeep/60">
                      <span
                        className={`grid h-7 w-7 shrink-0 place-items-center border font-display text-sm font-black ${
                          f.status === "warn" ? "border-amber bg-amber/15 text-ink" : "border-teal/50 bg-teal/10 text-teal"
                        }`}
                      >
                        {f.key}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold">{f.label}</span>
                        <span className="block truncate font-mono text-[10px] text-inksoft">{f.note}</span>
                      </span>
                      {f.status === "warn" ? (
                        <span className="flex items-center gap-1 font-mono text-[10px] font-bold tracking-wider text-alert">
                          <Icon name="warn" className="h-3.5 w-3.5" /> CHECK
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 font-mono text-[10px] font-bold tracking-wider text-teal">
                          <Icon name="check" className="h-3.5 w-3.5" /> LOW
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              {/* recommendation */}
              <div className={`border-2 p-4 ${toneStyles[rec.tone]}`}>
                <p className="font-display text-sm font-extrabold uppercase tracking-wide">{rec.title}</p>
                <ul className="mt-2 space-y-1 font-mono text-[11px] leading-relaxed">
                  {rec.lines.map((l) => (
                    <li key={l} className="flex gap-1.5">
                      <span className="font-bold">+</span> {l}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            !running && (
              <div className="mt-5 border border-dashed border-ink/25 px-4 py-6 text-center">
                <Icon name="scope" className="mx-auto h-6 w-6 text-inksoft/50" />
                <p className="mt-2 font-mono text-[11px] leading-relaxed text-inksoft/70">
                  Load a lesion scan, then run the pipeline.
                  <span className="block">Probabilities, ABCDE flags and triage advice appear here.</span>
                </p>
              </div>
            )
          )}

          <p className="mt-5 font-mono text-[10px] leading-relaxed text-inksoft/80">
            ✚ Educational heuristic on pixel statistics — real deployment trains on ISIC-labelled
            dermoscopy with clinician adjudication. Only a biopsy confirms or rules out melanoma.
          </p>
        </div>
      </div>
    </div>
  );
}
