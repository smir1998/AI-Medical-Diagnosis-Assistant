export const CXR_MODEL_ID = "emir-mutlu/pneumonia-cxr-convnext";
const MODEL_REVISION = "8b1c262f34b607ea7de88186a9ac42aea036100d";
const MODEL_URL = `https://huggingface.co/${CXR_MODEL_ID}/resolve/${MODEL_REVISION}/model_browser.onnx`;
const MODEL_SIZE = 224;
const CACHE_SIZE = 256;
const THRESHOLD = 0.576;

export interface CxrModelResult {
  probability: number;
  threshold: number;
  heatmapDataUrl: string;
  modelId: string;
  modelRevision: string;
}

type ProgressHandler = (percent: number) => void;
type InferenceSession = import("onnxruntime-web").InferenceSession;
let ortPromise: Promise<typeof import("onnxruntime-web")> | undefined;
let sessionPromise: Promise<InferenceSession> | undefined;

function loadOrt() {
  return (ortPromise ??= import("onnxruntime-web"));
}

function coefficients(inputSize: number, outputSize: number) {
  const scale = inputSize / outputSize;
  const filterScale = Math.max(scale, 1);
  const weights: Array<[number, Int32Array]> = [];
  const precision = 22;
  const one = 1 << precision;

  for (let output = 0; output < outputSize; output++) {
    const center = (output + 0.5) * scale;
    const start = Math.max(0, Math.trunc(center - filterScale + 0.5));
    const end = Math.min(inputSize, Math.trunc(center + filterScale + 0.5));
    const raw = new Float64Array(end - start);
    let total = 0;
    for (let i = 0; i < raw.length; i++) {
      const distance = Math.abs((i + start - center + 0.5) / filterScale);
      raw[i] = distance < 1 ? 1 - distance : 0;
      total += raw[i];
    }
    const normalized = new Int32Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
      const value = total ? raw[i] / total : 0;
      normalized[i] = Math.trunc(value * one + (value < 0 ? -0.5 : 0.5));
    }
    weights.push([start, normalized]);
  }
  return weights;
}

function resizeHorizontal(source: Uint8Array, width: number, height: number, outputWidth: number) {
  const weights = coefficients(width, outputWidth);
  const output = new Uint8Array(outputWidth * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < outputWidth; x++) {
      const [start, coefficientsForPixel] = weights[x];
      let sum = 1 << 21;
      for (let i = 0; i < coefficientsForPixel.length; i++) {
        sum += source[y * width + start + i] * coefficientsForPixel[i];
      }
      output[y * outputWidth + x] = Math.max(0, Math.min(255, Math.floor(sum / 2 ** 22)));
    }
  }
  return output;
}

function resizeVertical(source: Uint8Array, width: number, height: number, outputHeight: number) {
  const weights = coefficients(height, outputHeight);
  const output = new Uint8Array(width * outputHeight);
  for (let y = 0; y < outputHeight; y++) {
    const [start, coefficientsForPixel] = weights[y];
    for (let x = 0; x < width; x++) {
      let sum = 1 << 21;
      for (let i = 0; i < coefficientsForPixel.length; i++) {
        sum += source[(start + i) * width + x] * coefficientsForPixel[i];
      }
      output[y * width + x] = Math.max(0, Math.min(255, Math.floor(sum / 2 ** 22)));
    }
  }
  return output;
}

/** Pillow-compatible two-pass bilinear resize used by the published model demo. */
function resizeGray(source: Uint8Array, width: number, height: number, outputSize: number) {
  const horizontal = width === outputSize ? source : resizeHorizontal(source, width, height, outputSize);
  return height === outputSize ? horizontal : resizeVertical(horizontal, outputSize, height, outputSize);
}

async function createSession(onProgress?: ProgressHandler): Promise<InferenceSession> {
  const response = await fetch(MODEL_URL);
  if (!response.ok) throw new Error(`Could not download the radiology model (HTTP ${response.status}).`);
  if (!response.body) throw new Error("This browser cannot stream the model download.");

  const expectedBytes = Number(response.headers.get("content-length")) || 0;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    receivedBytes += value.length;
    if (expectedBytes) onProgress?.(Math.min(100, Math.round((receivedBytes / expectedBytes) * 100)));
  }

  const modelBytes = new Uint8Array(receivedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    modelBytes.set(chunk, offset);
    offset += chunk.length;
  }
  const ort = await loadOrt();
  return ort.InferenceSession.create(modelBytes, {
    executionProviders: ["wasm"],
    graphOptimizationLevel: "all",
  });
}

async function getSession(onProgress?: ProgressHandler) {
  if (!sessionPromise) {
    sessionPromise = createSession(onProgress).catch((error) => {
      sessionPromise = undefined;
      throw error;
    });
  }
  return sessionPromise;
}

async function imageToGrayPixels(dataUrl: string) {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  const { naturalWidth: width, naturalHeight: height } = image;
  if (!width || !height || width * height > 40_000_000) {
    throw new Error("This image is too large to safely process. Choose an image under 40 megapixels.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("This browser could not decode the image pixels.");
  context.fillStyle = "#000";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  const rgba = context.getImageData(0, 0, width, height).data;
  const gray = new Uint8Array(width * height);
  for (let i = 0, j = 0; i < gray.length; i++, j += 4) {
    gray[i] = (rgba[j] * 19595 + rgba[j + 1] * 38470 + rgba[j + 2] * 7471 + 0x8000) >> 16;
  }

  return { gray, width, height };
}

function makeHeatmap(cam: ArrayLike<number>) {
  const canvas = document.createElement("canvas");
  canvas.width = MODEL_SIZE;
  canvas.height = MODEL_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser could not draw the model heatmap.");
  const pixels = context.createImageData(MODEL_SIZE, MODEL_SIZE);

  for (let i = 0; i < MODEL_SIZE * MODEL_SIZE; i++) {
    const strength = Math.max(0, Math.min(1, Number(cam[i]) || 0));
    // Compact inferno-like scale with transparent low-activation areas.
    const t = strength;
    const base = i * 4;
    pixels.data[base] = Math.round(255 * Math.min(1, Math.max(0, 1.5 * t - 0.25)));
    pixels.data[base + 1] = Math.round(255 * Math.min(1, Math.max(0, 1.5 - Math.abs(2 * t - 1.0) * 1.5)));
    pixels.data[base + 2] = Math.round(255 * Math.min(1, Math.max(0, 1.1 - 1.7 * t)));
    pixels.data[base + 3] = Math.round(255 * Math.min(1, Math.max(0, (t - 0.15) / 0.85)) ** 0.8);
  }
  context.putImageData(pixels, 0, 0);
  return canvas.toDataURL("image/png");
}

/** Run the published CXR model entirely in this browser; uploaded pixels are not sent to a server. */
export async function scoreFrontalChestXray(
  dataUrl: string,
  onProgress?: ProgressHandler,
): Promise<CxrModelResult> {
  const { gray, width, height } = await imageToGrayPixels(dataUrl);
  const atCacheSize = resizeGray(gray, width, height, CACHE_SIZE);
  const modelPixels = resizeGray(atCacheSize, CACHE_SIZE, CACHE_SIZE, MODEL_SIZE);
  const input = Float32Array.from(modelPixels, (value) => value / 255);
  const [session, ort] = await Promise.all([getSession(onProgress), loadOrt()]);
  const output = await session.run({
    image: new ort.Tensor("float32", input, [1, 1, MODEL_SIZE, MODEL_SIZE]),
  });
  const probability = Number(output.probability?.data[0]);
  const cam = output.cam?.data as ArrayLike<number> | undefined;
  if (!Number.isFinite(probability) || probability < 0 || probability > 1 || !cam || cam.length !== MODEL_SIZE * MODEL_SIZE) {
    throw new Error("The radiology model returned an unexpected result.");
  }

  return {
    probability,
    threshold: THRESHOLD,
    heatmapDataUrl: makeHeatmap(cam),
    modelId: CXR_MODEL_ID,
    modelRevision: MODEL_REVISION,
  };
}
