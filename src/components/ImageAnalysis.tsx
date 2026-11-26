import { useState } from "react";
import normalSample from "../assets/cxr-normal.svg";
import pneumoniaSample from "../assets/cxr-pneumonia.svg";
import { inspectImagePixels, type ImageResult } from "../lib/pixel";

interface Props {
  onComplete: (result: ImageResult) => void;
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function ImageAnalysis({ onComplete }: Props) {
  const [image, setImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [source, setSource] = useState<ImageResult["source"]>("upload");
  const [result, setResult] = useState<ImageResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  const loadSample = (src: string, name: string) => {
    setImage(src);
    setFileName(name);
    setSource("sample");
    setResult(null);
    setError("");
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setResult(null);
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setImage(null);
      setFileName("");
      setError("Choose a JPEG, PNG, or WebP image.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setImage(null);
      setFileName("");
      setError("Image must be 10 MB or smaller.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === "string") {
        setImage(ev.target.result);
        setFileName(file.name);
        setSource("upload");
      } else {
        setError("This image could not be read. Try another file.");
      }
    };
    reader.onerror = () => setError("This image could not be read. Try another file.");
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const analyze = async () => {
    if (!image || analyzing) return;
    setAnalyzing(true);
    setError("");
    try {
      const analysis = await inspectImagePixels(source, fileName, image);
      setResult(analysis);
      onComplete(analysis);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not inspect this image.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => loadSample(normalSample, "synthetic-sample-a.svg")}
          className="inline-flex items-center gap-2 border border-ink/25 bg-paper px-3 py-2 font-mono text-xs font-semibold text-ink transition-all duration-200 hover:-translate-y-px hover:border-ink"
        >
          Synthetic sample A
        </button>
        <button
          type="button"
          onClick={() => loadSample(pneumoniaSample, "synthetic-sample-b.svg")}
          className="inline-flex items-center gap-2 border border-ink/25 bg-paper px-3 py-2 font-mono text-xs font-semibold text-ink transition-all duration-200 hover:-translate-y-px hover:border-ink"
        >
          Synthetic sample B
        </button>
        <label className="inline-flex cursor-pointer items-center gap-2 border border-dashed border-teal/60 px-3 py-2 font-mono text-xs font-semibold text-teal transition-all duration-200 hover:bg-teal/10">
          Upload image
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} className="sr-only" />
        </label>
      </div>

      <p className="border-l-2 border-amber bg-amber/10 px-3 py-2 text-xs leading-relaxed text-ink">
        Pixel inspection only: this lab measures brightness and variation in the image. It does not identify
        anatomy, detect disease, run a trained radiology model, or provide a medical interpretation. Image
        processing happens in this browser.
      </p>
      {error && <p role="alert" className="text-sm font-semibold text-alert">{error}</p>}

      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <div className="dark-grid relative flex min-h-[280px] items-center justify-center overflow-hidden border-2 border-pine">
          {image ? (
            <div className="w-full p-4">
              <img src={image} alt="Image loaded for pixel statistics" className="mx-auto max-h-[340px] w-auto max-w-full border border-mint/25 object-contain" />
              <p className="mt-2 text-center font-mono text-[10px] tracking-[0.2em] text-mint/60">
                {fileName.toUpperCase()}
              </p>
            </div>
          ) : (
            <p className="px-6 text-center font-mono text-xs leading-relaxed text-mint/50">
              no image loaded
              <span className="mt-1 block">choose a synthetic sample or upload a JPEG, PNG, or WebP image</span>
            </p>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div aria-live="polite" className="min-h-[190px] flex-1 border border-pine bg-pinedeep px-4 py-3 font-mono text-[11px] leading-relaxed text-mint">
            <p className="mb-3 text-mint/55">// measured image pixel statistics</p>
            {result ? (
              <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2">
                <dt>Image dimensions</dt><dd>{result.width} × {result.height}</dd>
                <dt>Mean luminance</dt><dd>{result.meanLuminance} / 255</dd>
                <dt>Luminance variation</dt><dd>{result.luminanceStdDev} / 255</dd>
                <dt>Observed range</dt><dd>{result.minLuminance}–{result.maxLuminance}</dd>
                <dt>Pixels sampled</dt><dd>{result.sampledPixels.toLocaleString()}</dd>
                <dt>Run ID</dt><dd>{result.runId}</dd>
              </dl>
            ) : (
              <p className="text-mint/45">Pixel values will appear here after analysis.</p>
            )}
            <p className="mt-4 border-t border-mint/15 pt-2 text-[10px] text-mint/45">
              Measurements are descriptive only. No disease score or heatmap is generated.
            </p>
          </div>

          <button
            type="button"
            onClick={analyze}
            disabled={!image || analyzing}
            className="inline-flex items-center justify-center gap-2 bg-teal px-5 py-3 font-display text-sm font-extrabold uppercase tracking-wider text-paper shadow-[5px_5px_0_0_rgba(11,47,45,1)] transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {analyzing ? "Reading pixels…" : "Inspect image pixels"}
          </button>
        </div>
      </div>
    </div>
  );
}
