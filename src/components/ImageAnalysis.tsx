import { useState } from "react";
import normalSample from "../assets/cxr-normal.svg";
import pneumoniaSample from "../assets/cxr-pneumonia.svg";
import { inspectImagePixels, type ImageResult } from "../lib/pixel";
import { activationMapDataUrl, CXR_MODEL_CARD, scoreFrontalChestXray } from "../lib/cxrModel";
import { FRACTURE_CAM_SIZE, FRACTURE_MODEL_CARD, scoreOrthopedicXray } from "../lib/fractureModel";

interface Props {
  onComplete: (result: ImageResult) => void;
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ORTHOPEDIC_INPUT_SIZE = 384;

export function ImageAnalysis({ onComplete }: Props) {
  const [image, setImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [source, setSource] = useState<ImageResult["source"]>("upload");
  const [modality, setModality] = useState<"chest" | "orthopedic">("chest");
  const [result, setResult] = useState<ImageResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [modelProgress, setModelProgress] = useState<number | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [selectedFindingIndex, setSelectedFindingIndex] = useState(0);
  const [error, setError] = useState("");

  const loadSample = (src: string, name: string) => {
    setModality("chest");
    setImage(src);
    setFileName(name);
    setSource("sample");
    setResult(null);
    setModelProgress(null);
    setShowHeatmap(true);
    setSelectedFindingIndex(0);
    setError("");
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setResult(null);
    setSelectedFindingIndex(0);
    setModelProgress(null);
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
    setModelProgress(null);
    try {
      if (source !== "upload") {
        throw new Error("Synthetic illustrations are for pixel practice only. Upload a real chest or orthopedic X-ray for its matching research model.");
      }
      const analysis = await inspectImagePixels(source, fileName, image);
      if (modality === "chest") {
        const model = await scoreFrontalChestXray(image, setModelProgress);
        setSelectedFindingIndex(model.findings[0]?.modelIndex ?? 0);
        analysis.model = model;
      } else {
        analysis.fractureModel = await scoreOrthopedicXray(image, setModelProgress);
      }
      setResult(analysis);
      onComplete(analysis);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not inspect this image.");
    } finally {
      setAnalyzing(false);
    }
  };

  const selectedFinding = result?.model?.findings.find((finding) => finding.modelIndex === selectedFindingIndex)
    ?? result?.model?.findings[0];
  const overlayStyle = result && modality === "chest"
    ? {
        width: `${(Math.min(result.width, result.height) / result.width) * 100}%`,
        height: `${(Math.min(result.width, result.height) / result.height) * 100}%`,
        left: `${((result.width - Math.min(result.width, result.height)) / 2 / result.width) * 100}%`,
        top: `${((result.height - Math.min(result.width, result.height)) / 2 / result.height) * 100}%`,
      }
    : result
      ? {
          width: `${(Math.round((result.width * ORTHOPEDIC_INPUT_SIZE) / Math.max(result.width, result.height)) / ORTHOPEDIC_INPUT_SIZE) * 100}%`,
          height: `${(Math.round((result.height * ORTHOPEDIC_INPUT_SIZE) / Math.max(result.width, result.height)) / ORTHOPEDIC_INPUT_SIZE) * 100}%`,
          left: `${Math.floor((ORTHOPEDIC_INPUT_SIZE - Math.round((result.width * ORTHOPEDIC_INPUT_SIZE) / Math.max(result.width, result.height))) / 2) / ORTHOPEDIC_INPUT_SIZE * 100}%`,
          top: `${Math.floor((ORTHOPEDIC_INPUT_SIZE - Math.round((result.height * ORTHOPEDIC_INPUT_SIZE) / Math.max(result.width, result.height))) / 2) / ORTHOPEDIC_INPUT_SIZE * 100}%`,
        }
      : undefined;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2" role="group" aria-label="X-ray type">
        <button type="button" onClick={() => { setModality("chest"); setResult(null); }} aria-pressed={modality === "chest"} className="border-2 border-ink px-3 py-2 font-mono text-xs font-bold aria-pressed:bg-teal aria-pressed:text-paper">Chest X-ray</button>
        <button type="button" onClick={() => { setModality("orthopedic"); setResult(null); }} aria-pressed={modality === "orthopedic"} className="border-2 border-ink px-3 py-2 font-mono text-xs font-bold aria-pressed:bg-teal aria-pressed:text-paper">Orthopedic X-ray</button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {modality === "chest" && <button
          type="button"
          onClick={() => loadSample(normalSample, "synthetic-sample-a.svg")}
          className="inline-flex items-center gap-2 border border-ink/25 bg-paper px-3 py-2 font-mono text-xs font-semibold text-ink transition-all duration-200 hover:-translate-y-px hover:border-ink"
        >
          Synthetic sample A
        </button>}
        {modality === "chest" && <button
          type="button"
          onClick={() => loadSample(pneumoniaSample, "synthetic-sample-b.svg")}
          className="inline-flex items-center gap-2 border border-ink/25 bg-paper px-3 py-2 font-mono text-xs font-semibold text-ink transition-all duration-200 hover:-translate-y-px hover:border-ink"
        >
          Synthetic sample B
        </button>}
        <label className="inline-flex cursor-pointer items-center gap-2 border border-dashed border-teal/60 px-3 py-2 font-mono text-xs font-semibold text-teal transition-all duration-200 hover:bg-teal/10">
          Upload image
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} className="sr-only" />
        </label>
      </div>

      <p className="border-l-2 border-amber bg-amber/10 px-3 py-2 text-xs leading-relaxed text-ink">
        {modality === "chest"
          ? "Research and education only. Upload a frontal chest X-ray to score 18 chest findings and view a class activation map for each. These outputs are not calibrated probabilities or a diagnosis. The chest model cannot interpret bone X-rays."
          : "Research and education only. Upload a plain orthopedic X-ray for a FracAtlas-trained fracture score and Grad-CAM map. It was evaluated on hand, leg, hip and shoulder images from FracAtlas; it cannot read chest X-rays, CT, MRI, skull, spine or ribs. A low score cannot rule out a fracture."} Image inference stays in this browser. First use downloads the selected model and ONNX browser runtime.
      </p>
      {error && <p role="alert" className="text-sm font-semibold text-alert">{error}</p>}

      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <div className="dark-grid relative flex min-h-[280px] items-center justify-center overflow-hidden border-2 border-pine">
          {image ? (
            <div className="w-full p-4">
              <div className="relative mx-auto w-fit max-w-full">
                <img src={image} alt="Image loaded for model analysis" className="block max-h-[340px] max-w-full border border-mint/25 object-contain" />
                {result?.model && showHeatmap && modality === "chest" && (
                  <img
                    src={activationMapDataUrl(result.model.camMaps[selectedFindingIndex] ?? result.model.camMaps[0] ?? [], 7, 224)}
                    alt={`Class activation map for ${selectedFinding?.name ?? "selected finding"}; highlighted areas show model activation, not a lesion`}
                    style={overlayStyle}
                    className="pointer-events-none absolute object-fill"
                  />
                )}
                {result?.fractureModel && showHeatmap && modality === "orthopedic" && (
                  <img
                    src={activationMapDataUrl(result.fractureModel.camMap, FRACTURE_CAM_SIZE, ORTHOPEDIC_INPUT_SIZE)}
                    alt="Grad-CAM heatmap showing regions associated with the fracture model score; not a fracture outline"
                    style={overlayStyle}
                    className="pointer-events-none absolute object-fill"
                  />
                )}
              </div>
              <p className="mt-2 text-center font-mono text-[10px] tracking-[0.2em] text-mint/60">
                {fileName.toUpperCase()}
              </p>
            </div>
          ) : (
            <p className="px-6 text-center font-mono text-xs leading-relaxed text-mint/50">
              no image loaded
              <span className="mt-1 block">upload a JPEG, PNG, or WebP image{modality === "chest" ? " or choose a synthetic chest sample" : ""}</span>
            </p>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div aria-live="polite" className="min-h-[190px] flex-1 border border-pine bg-pinedeep px-4 py-3 font-mono text-[11px] leading-relaxed text-mint">
            <p className="mb-3 text-mint/55">// research model output</p>
            {result ? (
              <>
                <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2">
                  {modality === "chest" ? <>
                    <dt>Highest-scoring model finding</dt><dd className="font-bold text-amber">{selectedFinding?.name}</dd>
                    <dt>Relative model score</dt><dd>{((selectedFinding?.score ?? 0) * 100).toFixed(1)} / 100</dd>
                  </> : <>
                    <dt>Fracture model score</dt><dd className="font-bold text-amber">{((result.fractureModel?.score ?? 0) * 100).toFixed(1)} / 100</dd>
                    <dt>Research flag</dt><dd>{result.fractureModel?.flagged ? "Above model cutoff" : "Below model cutoff"}</dd>
                    <dt>Model cutoff</dt><dd>{((result.fractureModel?.threshold ?? 0) * 100).toFixed(2)} / 100</dd>
                  </>}
                  <dt>Image dimensions</dt><dd>{result.width} × {result.height}</dd>
                  <dt>Mean luminance</dt><dd>{result.meanLuminance} / 255</dd>
                  <dt>Luminance variation</dt><dd>{result.luminanceStdDev} / 255</dd>
                  <dt>Observed pixel range</dt><dd>{result.minLuminance}–{result.maxLuminance}</dd>
                  <dt>Pixels sampled</dt><dd>{result.sampledPixels.toLocaleString()}</dd>
                  <dt>Model</dt><dd><a href={modality === "chest" ? CXR_MODEL_CARD : FRACTURE_MODEL_CARD} target="_blank" rel="noreferrer" className="underline">{modality === "chest" ? "XRV DenseNet · 18 findings" : "FracAtlas ConvNeXt-Tiny"}</a></dd>
                </dl>
                {modality === "chest" ? <div className="mt-4 border-t border-mint/15 pt-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-mint/60">Ranked model outputs · select to inspect map</p>
                  <ol className="max-h-56 space-y-1 overflow-y-auto pr-1">
                    {result.model!.findings.map((finding, index) => (
                      <li key={finding.name}>
                        <button
                          type="button"
                          onClick={() => setSelectedFindingIndex(finding.modelIndex)}
                          aria-pressed={selectedFindingIndex === finding.modelIndex}
                          className="grid w-full grid-cols-[1fr_auto] gap-3 px-2 py-1 text-left aria-pressed:bg-teal/20"
                        >
                          <span>{index + 1}. {finding.name}</span><span>{(finding.score * 100).toFixed(1)}</span>
                        </button>
                      </li>
                    ))}
                  </ol>
                </div> : <p className="mt-3 border-t border-mint/15 pt-2 text-[10px] text-mint/55">The Grad-CAM map highlights model activation; it does not mark or confirm a fracture.</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setShowHeatmap(false)} aria-pressed={!showHeatmap} className="border border-mint/30 px-2 py-1 text-[10px] aria-pressed:bg-teal">Original</button>
                  <button type="button" onClick={() => setShowHeatmap(true)} aria-pressed={showHeatmap} className="border border-mint/30 px-2 py-1 text-[10px] aria-pressed:bg-teal">Activation overlay</button>
                </div>
              </>
            ) : (
              <p className="text-mint/45">{modality === "chest" ? "The ranked findings and activation map will appear after a frontal chest X-ray is analyzed." : "The fracture score and Grad-CAM will appear after an orthopedic X-ray is analyzed."}</p>
            )}
            <p className="mt-4 border-t border-mint/15 pt-2 text-[10px] text-mint/45">
              {modality === "chest"
                ? result?.model ? "Research only; not a disease conclusion. Scores are independent and are not calibrated probabilities. The activation map is coarse model attention, not a lesion outline. Performance varies across datasets and populations." : "Synthetic samples support pixel practice only; they are not scored by the trained model."
                : result?.fractureModel ? "Research only; this score does not diagnose or rule out fracture. The activation map is not a fracture outline. The model's published held-out precision was 39.8%, with performance varying by bone region." : "This model only accepts orthopedic X-rays; synthetic chest samples are not scored."}
            </p>
          </div>

          <button
            type="button"
            onClick={analyze}
            disabled={!image || analyzing}
            className="inline-flex items-center justify-center gap-2 bg-teal px-5 py-3 font-display text-sm font-extrabold uppercase tracking-wider text-paper shadow-[5px_5px_0_0_rgba(11,47,45,1)] transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {analyzing ? (modelProgress === null ? "Preparing model…" : `Downloading model ${modelProgress}%…`) : "Run research model"}
          </button>
        </div>
      </div>
    </div>
  );
}
