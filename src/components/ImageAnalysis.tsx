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
  const [fileErr, setFileErr] = useState<string | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [imgFailed, setImgFailed] = useState(false);
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
    setFileErr(null);
    setResult(null);
    setLogIdx(-1);
    setDims(null);
    setImgFailed(false);
    setSource(kind);
    setFileName(kind === "pneumonia-sample" ? "PA_chest_0412.dcm.png" : "PA_chest_0107.dcm.png");
    setSeedKey(String(Date.now()));
    setImgSrc(kind === "pneumonia-sample" ? SAMPLE_XRAY_PNEUMONIA : SAMPLE_XRAY_NORMAL);
  };

  const acceptFile = useCallback(
    (file: File | undefined | null) => {
      if (running || !file) return;
      if (!file.type.startsWith("image/")) {
        setFileErr(`"${file.name}" rejected — the CNN intake accepts JPG / PNG radiograph exports only.`);
        return;
      }
      setFileErr(null);
      setResult(null);
      setLogIdx(-1);
      setDims(null);
      setImgFailed(false);
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
          onChange={(e) => {
            acceptFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      {fileErr && (
        <p className="flex items-start gap-2 border border-alert/50 bg-alert/10 px-3 py-2 font-mono text-[11px] font-semibold text-alertdeep">
          <Icon name="warn" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-alert" /> {fileErr}
        </p>
      )}

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
              {imgFailed ? (
                <div className="mx-auto grid max-w-sm place-items-center border border-alert/40 bg-alert/10 px-6 py-10 text-center">
                  <Icon name="warn" className="h-8 w-8 text-alert" />
                  <p className="mt-3 font-mono text-[10px] font-bold tracking-[0.24em] text-alert">
                    STUDY BUFFER LOST
                  </p>
                  <p className="mt-1.5 font-mono text-[10px] leading-relaxed text-paper/50">
                    The image could not be decoded. Load a sample study or drop another radiograph.
                  </p>
                </div>
              ) : (
                <img
                  src={imgSrc}
                  alt={fileName || "Chest radiograph"}
                  onLoad={(e) =>
                    setDims({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })
                  }
                  onError={() => setImgFailed(true)}
                  className="mx-auto max-h-[340px] w-auto max-w-full border border-mint/25 object-contain"
                  draggable={false}
                />
              )}
              {running && <span className="scanline" />}
              {result && !running && (
                <span
                  className="hotspot pointer-events-none absolute rounded-full"
                  style={{
                    left: `${result.heat.x}%`,
                    top: `${result.heat.y}%`,
                    width: `${result.heat.size}%`,
                    height: `${result.heat.size}%`,
                    transform: "translate(-50%, -50%)",
                    background:
                      result.pneumonia > 50
                        ? "radial-gradient(circle, rgba(199,70,60,0.55) 0%, rgba(199,70,60,0.18) 55%, transparent 72%)"
                        : "radial-gradient(circle, rgba(143,227,207,0.4) 0%, rgba(143,227,207,0.12) 55%, transparent 72%)",
                    border: `1px solid ${result.pneumonia > 50 ? "rgba(199,70,60,0.8)" : "rgba(143,227,207,0.7)"}`,
                  }}
                />
              )}
              <p className="mt-2 text-center font-mono text-[10px] tracking-[0.2em] text-mint/60">
                {fileName.toUpperCase() || "AWAITING STUDY"}
                {source !== "upload" && <span className="text-amber"> · SYNTHETIC TEACHING STUDY</span>}
                {dims && <span className="text-mint"> · {dims.w}×{dims.h}px</span>} · DROP OR BROWSE TO REPLACE
              </p>
            </div>
          ) : (
            <p className="px-6 text-center font-mono text-xs leading-relaxed text-mint/50">
              no study loaded
              <span className="block mt-1">choose a sample above or drop a radiograph here</span>
            </p>
          )}
        </div>

        {/* pipeline console + results */}
        <div className="flex flex-col gap-4">
          <div className="dark-grid min-h-[190px] flex-1 border border-pine px-4 py-3 font-mono text-[11px] leading-relaxed text-mint">
            {imgSrc && (
              <p className="text-mint/80">
                ▸ buffer decoded{dims ? ` · ${dims.w}×${dims.h}×3 → tensor` : " …"}
              </p>
            )}
            {logIdx === -1 && !running && (
              <span className="text-mint/40">// CNN pipeline trace …</span>
            )}
            {CNN_LOG.slice(0, logIdx + 1).map((l, i) => (
              <p key={i} className={i === logIdx && running ? "type-caret" : ""}>
                {l.line}
              </p>
            ))}
          </div>

          <button
            onClick={analyze}
            disabled={running || !imgSrc}
            className={`inline-flex items-center justify-center gap-2 px-5 py-3 font-display text-sm font-extrabold uppercase tracking-wider transition-all duration-200 ${
              running || !imgSrc
                ? "cursor-not-allowed border border-ink/20 bg-paperdeep text-ink/40"
                : "bg-teal text-paper shadow-[5px_5px_0_0_rgba(11,47,45,1)] hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_rgba(11,47,45,1)] active:translate-y-0"
            }`}
          >
            {running ? (
              <>
                <Icon name="layers" className="h-4 w-4 spin-slow" /> Segmenting…
              </>
            ) : (
              <>
                <Icon name="scan" className="h-4 w-4" /> Run CNN inference
              </>
            )}
          </button>

          {result && !running && (
            <div className="border border-ink/20 bg-paperdeep/40 p-4">
              <p className="mb-3 flex items-center justify-between font-mono text-[10px] font-bold tracking-[0.22em] text-inksoft">
                <span>CLASSIFICATION · RUN {result.runId}</span>
                <span className={result.pneumonia > 50 ? "text-alert" : "text-teal"}>
                  {result.pneumonia > 50 ? "⚠ REVIEW" : "✓ CLEAR"}
                </span>
              </p>
              {[
                { label: "Pneumonia", v: result.pneumonia, cls: "bg-alert", txt: "text-alert" },
                { label: "Normal", v: result.normal, cls: "bg-teal", txt: "text-teal" },
              ].map((row) => (
                <div key={row.label} className="mb-2.5 last:mb-0">
                  <div className="mb-1 flex items-baseline justify-between">
                    <span className="font-mono text-[11px] font-semibold">{row.label}</span>
                    <CountUp value={row.v} decimals={1} suffix="%" className={`font-mono text-sm font-bold tabular-nums ${row.txt}`} />
                  </div>
                  <div className="h-2 bg-ink/10">
                    <div className={`bar-fill h-full ${row.cls}`} style={{ width: `${row.v}%` }} />
                  </div>
                </div>
              ))}
              <p className="mt-3 border-t border-dashed border-ink/20 pt-2 font-mono text-[10px] leading-relaxed text-inksoft">
                Grad-CAM hotspot marks the region driving the decision. Educational simulation — a
                radiologist confirms every real study.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
