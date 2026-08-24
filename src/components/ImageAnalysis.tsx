import { useCallback, useEffect, useRef, useState } from "react";
import { SAMPLE_XRAY_NORMAL, SAMPLE_XRAY_PNEUMONIA } from "../data/medical";
import { CNN_LOG, predictImage, prefersReducedMotion, sleep } from "../lib/engine";
import type { ImageResult } from "../lib/engine";
import { CountUp, Icon } from "./ui";

interface Props {
  onComplete: (r: ImageResult) => void;
  onPipeline: (stage: number, running: boolean) => void;
}

export function ImageAnalysis({ onComplete, onPipeline }: Props) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [source, setSource] = useState<ImageResult["source"]>("pneumonia-sample");
  const [seedKey, setSeedKey] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [running, setRunning] = useState(false);
  const [logIdx, setLogIdx] = useState(-1);
  const [result, setResult] = useState<ImageResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const loadSample = (kind: "pneumonia-sample" | "normal-sample") => {
    if (running) return;
    setResult(null);
    setLogIdx(-1);
    setSource(kind);
    setFileName(kind === "pneumonia-sample" ? "PA_chest_0412.dcm.png" : "PA_chest_0107.dcm.png");
    setSeedKey(String(Date.now()));
    setImgSrc(kind === "pneumonia-sample" ? SAMPLE_XRAY_PNEUMONIA : SAMPLE_XRAY_NORMAL);
  };

  const acceptFile = useCallback(
    (file: File | undefined | null) => {
      if (running || !file || !file.type.startsWith("image/")) return;
      setResult(null);
      setLogIdx(-1);
      setSource("upload");
      setFileName(file.name);
      setSeedKey(`${file.size}-${file.name}`);
      setImgSrc(URL.createObjectURL(file));
    },
    [running]
  );

  const analyze = async () => {
    if (running || !imgSrc) return;
    const reduced = prefersReducedMotion();
    setRunning(true);
    setResult(null);
    setLogIdx(-1);
    for (let i = 0; i < CNN_LOG.length; i++) {
      onPipeline(CNN_LOG[i].stage, true);
      setLogIdx(i);
      if (!reduced) await sleep(i === 0 ? 240 : 260);
      if (!alive.current) return;
    }
    const res = predictImage(source, fileName, seedKey);
    setResult(res);
    onComplete(res);
    onPipeline(4, false);
    setRunning(false);
  };

  return (
    <div className="space-y-5">
      {/* source picker */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => loadSample("pneumonia-sample")}
          disabled={running}
          className={`inline-flex items-center gap-2 border px-3 py-2 font-mono text-xs font-semibold transition-all duration-200 disabled:opacity-50 ${
            source === "pneumonia-sample" && imgSrc
              ? "border-ink bg-ink text-paper shadow-[3px_3px_0_0_rgba(215,69,59,0.9)]"
              : "border-ink/25 bg-paper text-ink hover:border-ink hover:-translate-y-px"
          }`}
        >
          <Icon name="scan" className="h-3.5 w-3.5" /> Sample · suspected pneumonia
        </button>
        <button
          onClick={() => loadSample("normal-sample")}
          disabled={running}
          className={`inline-flex items-center gap-2 border px-3 py-2 font-mono text-xs font-semibold transition-all duration-200 disabled:opacity-50 ${
            source === "normal-sample" && imgSrc
              ? "border-ink bg-ink text-paper shadow-[3px_3px_0_0_rgba(14,124,114,0.9)]"
              : "border-ink/25 bg-paper text-ink hover:border-ink hover:-translate-y-px"
          }`}
        >
          <Icon name="scan" className="h-3.5 w-3.5" /> Sample · healthy control
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={running}
          className="inline-flex items-center gap-2 border border-dashed border-teal/60 px-3 py-2 font-mono text-xs font-semibold text-teal transition-all duration-200 hover:bg-teal/10 hover:-translate-y-px disabled:opacity-50"
        >
          <Icon name="upload" className="h-3.5 w-3.5" /> Upload radiograph
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => acceptFile(e.target.files?.[0])}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        {/* viewer */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            acceptFile(e.dataTransfer.files?.[0]);
          }}
          className={`dark-grid relative flex min-h-[280px] items-center justify-center overflow-hidden border-2 transition-colors duration-200 ${
            dragOver ? "border-mint" : "border-pine"
          }`}
        >
          {/* corner brackets */}
          {["top-2 left-2 border-t-2 border-l-2", "top-2 right-2 border-t-2 border-r-2", "bottom-2 left-2 border-b-2 border-l-2", "bottom-2 right-2 border-b-2 border-r-2"].map(
            (c) => (
              <span key={c} className={`absolute h-5 w-5 border-mint/70 ${c}`} />
            )
          )}

          {imgSrc ? (
            <div className="relative w-full p-4">
              <img
                src={imgSrc}
                alt="Chest radiograph under analysis"
                className="mx-auto max-h-[340px] w-auto border border-mint/20 object-contain"
                draggable={false}
              />
              {running && <span className="scanline" />}
              {result && result.pneumonia > 35 && (
                <span
                  className="heat-spot pointer-events-none absolute rounded-full"
                  style={{
                    left: `${result.heat.x}%`,
                    top: `${result.heat.y}%`,
                    width: `${result.heat.size}%`,
                    aspectRatio: "1",
                    background:
                      "radial-gradient(circle, rgba(215,69,59,0.65) 0%, rgba(224,154,47,0.35) 45%, transparent 70%)",
                    transform: "translate(-50%, -50%)",
                  }}
                />
              )}
              <p className="mt-3 flex items-center justify-between font-mono text-[10px] tracking-wider text-mint/70">
                <span className="truncate pr-2">FILE {fileName}</span>
                <span className="shrink-0">W:2048 L:512 · PA VIEW</span>
              </p>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="group flex flex-col items-center gap-3 px-6 py-12 text-center"
            >
              <span className="grid h-14 w-14 place-items-center border-2 border-dashed border-mint/40 text-mint/70 transition-all duration-300 group-hover:border-mint group-hover:text-mint float-slow">
                <Icon name="upload" className="h-6 w-6" />
              </span>
              <span className="font-mono text-xs leading-relaxed text-mint/60">
                drop a chest X-ray here
                <span className="block text-mint/35">or load a sample study above</span>
              </span>
            </button>
          )}
        </div>

        {/* CNN console */}
        <div className="flex flex-col">
          <div className="dark-grid flex-1 border border-pine px-4 py-3 font-mono text-[11px] leading-relaxed text-mint">
            <p className="mb-2 flex items-center justify-between border-b border-mint/15 pb-2 text-[10px] tracking-[0.2em] text-mint/50">
              <span>PNEUMONET-V3 · CONV STACK</span>
              {running && <span className="text-mint blink-soft">● REC</span>}
            </p>
            <div className="max-h-[180px] space-y-0.5 overflow-y-auto log-scroll">
              {logIdx < 0 && !running && <span className="text-mint/35">// awaiting study …</span>}
              {CNN_LOG.slice(0, logIdx + 1).map((l, i) => (
                <p key={i} className={i === logIdx && running ? "type-caret" : ""}>
                  {l.line}
                </p>
              ))}
            </div>
          </div>

          <button
            onClick={analyze}
            disabled={running || !imgSrc}
            className={`mt-3 inline-flex w-full items-center justify-center gap-2 px-6 py-3.5 font-display text-sm font-extrabold uppercase tracking-wider transition-all duration-200 ${
              running || !imgSrc
                ? "cursor-not-allowed border border-ink/20 bg-paperdeep text-ink/40"
                : "bg-teal text-paper shadow-[5px_5px_0_0_rgba(11,47,45,1)] hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_rgba(11,47,45,1)] active:translate-y-0 active:shadow-[3px_3px_0_0_rgba(11,47,45,1)]"
            }`}
          >
            {running ? (
              <>
                <Icon name="scan" className="h-4 w-4 spin-slow" /> Scanning…
              </>
            ) : (
              <>
                <Icon name="scan" className="h-4 w-4" /> Run CNN analysis
              </>
            )}
          </button>

          {result && (
            <div className="mt-3 space-y-2.5 border border-ink/15 bg-paper p-3.5">
              <p className="flex items-center justify-between font-mono text-[10px] tracking-[0.18em] text-inksoft uppercase">
                <span>Classification · run {result.runId}</span>
                <span className={result.pneumonia > 50 ? "text-alert" : "text-teal"}>
                  {result.pneumonia > 50 ? "▲ ABNORMAL" : "▼ NORMAL"}
                </span>
              </p>
              {(
                [
                  { label: "Pneumonia", v: result.pneumonia, cls: "bg-alert" },
                  { label: "Normal", v: result.normal, cls: "bg-teal" },
                ] as const
              ).map((row, i) => (
                <div key={row.label} className="flex items-center gap-3">
                  <span className="w-20 font-mono text-xs text-inksoft">{row.label}</span>
                  <div className="h-2.5 flex-1 bg-ink/10">
                    <div
                      className={`bar-fill h-full ${row.cls}`}
                      style={{ width: `${row.v}%`, animationDelay: `${i * 140}ms` }}
                    />
                  </div>
                  <CountUp value={row.v} decimals={1} suffix="%" className="w-16 text-right font-mono text-sm font-bold tabular-nums" />
                </div>
              ))}
              <p className="border-t border-dashed border-ink/15 pt-2 text-xs leading-relaxed text-inksoft">
                {result.pneumonia > 50 ? (
                  <>
                    <span className="font-semibold text-alert">Consolidation pattern flagged.</span> Grad-CAM
                    attention concentrates in the right lower zone — a radiologist should review this study.
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-teal">No focal opacity detected.</span> Lung fields read
                    clear; attention map diffuse and low-intensity.
                  </>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
