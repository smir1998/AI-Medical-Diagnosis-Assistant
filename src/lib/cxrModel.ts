export const CXR_MODEL_ID = "TorchXRayVision densenet121-res224-all";
export const CXR_MODEL_CARD = "https://mlmed.org/torchxrayvision/models.html";
const MODEL_ASSET = "models/xrv-densenet121-all.onnx";
const MODEL_REVISION = "TorchXRayVision 1.4.0 / upstream v1 weights";
const INPUT_SIZE = 224;
const CAM_SIZE = 7;

export const CHEST_FINDINGS = [
  "Atelectasis",
  "Consolidation",
  "Infiltration",
  "Pneumothorax",
  "Edema",
  "Emphysema",
  "Fibrosis",
  "Effusion",
  "Pneumonia",
  "Pleural thickening",
  "Cardiomegaly",
  "Nodule",
  "Mass",
  "Hernia",
  "Lung lesion",
  "Fracture",
  "Lung opacity",
  "Enlarged cardiomediastinum",
] as const;

export interface CxrFinding {
  name: (typeof CHEST_FINDINGS)[number];
  score: number;
  modelIndex: number;
}

export interface CxrModelResult {
  findings: CxrFinding[];
  camMaps: number[][];
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
  const one = 1 << 22;

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
      const [start, coeffs] = weights[x];
      let sum = 1 << 21;
      for (let i = 0; i < coeffs.length; i++) sum += source[y * width + start + i] * coeffs[i];
      output[y * outputWidth + x] = Math.max(0, Math.min(255, Math.floor(sum / 2 ** 22)));
    }
  }
  return output;
}

function resizeVertical(source: Uint8Array, width: number, height: number, outputHeight: number) {
  const weights = coefficients(height, outputHeight);
  const output = new Uint8Array(width * outputHeight);
  for (let y = 0; y < outputHeight; y++) {
    const [start, coeffs] = weights[y];
    for (let x = 0; x < width; x++) {
      let sum = 1 << 21;
      for (let i = 0; i < coeffs.length; i++) sum += source[(start + i) * width + x] * coeffs[i];
      output[y * width + x] = Math.max(0, Math.min(255, Math.floor(sum / 2 ** 22)));
    }
  }
  return output;
}

/** Center crop to the square framing used for chest radiographs, then bilinear resize. */
function centerCropAndResize(source: Uint8Array, width: number, height: number) {
  const side = Math.min(width, height);
  const left = Math.floor((width - side) / 2);
  const top = Math.floor((height - side) / 2);
  const square = new Uint8Array(side * side);
  for (let y = 0; y < side; y++) {
    square.set(source.subarray((top + y) * width + left, (top + y) * width + left + side), y * side);
  }
  const horizontal = side === INPUT_SIZE ? square : resizeHorizontal(square, side, side, INPUT_SIZE);
  return side === INPUT_SIZE ? horizontal : resizeVertical(horizontal, INPUT_SIZE, side, INPUT_SIZE);
}

async function imageToModelInput(dataUrl: string) {
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

  const resized = centerCropAndResize(gray, width, height);
  // TorchXRayVision's image pipeline scales 8-bit gray values from [0, 255] to [-1, 1].
  return Float32Array.from(resized, (value) => (value / 255) * 2 - 1);
}

async function createSession(onProgress?: ProgressHandler): Promise<InferenceSession> {
  const modelUrl = `${import.meta.env.BASE_URL}${MODEL_ASSET}`;
  const response = await fetch(modelUrl);
  if (!response.ok) throw new Error(`Could not load the chest X-ray model (HTTP ${response.status}).`);
  if (!response.body) throw new Error("This browser cannot stream the chest X-ray model.");

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
  ort.env.wasm.numThreads = 1;
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

/** Score all 18 findings with the pretrained model; uploaded image pixels stay in-browser. */
export async function scoreFrontalChestXray(
  dataUrl: string,
  onProgress?: ProgressHandler,
): Promise<CxrModelResult> {
  const input = await imageToModelInput(dataUrl);
  const [session, ort] = await Promise.all([getSession(onProgress), loadOrt()]);
  const output = await session.run({
    image: new ort.Tensor("float32", input, [1, 1, INPUT_SIZE, INPUT_SIZE]),
  });
  const rawScores = output.scores?.data as ArrayLike<number> | undefined;
  const rawCams = output.cams?.data as ArrayLike<number> | undefined;
  const expectedCams = CHEST_FINDINGS.length * CAM_SIZE * CAM_SIZE;
  if (!rawScores || rawScores.length !== CHEST_FINDINGS.length || !rawCams || rawCams.length !== expectedCams) {
    throw new Error("The chest X-ray model returned an unexpected result.");
  }

  const findings = CHEST_FINDINGS.map((name, index) => ({
    name,
    score: Number(rawScores[index]),
    modelIndex: index,
  })).sort((a, b) => b.score - a.score);
  const camMaps = CHEST_FINDINGS.map((_, findingIndex) =>
    Array.from({ length: CAM_SIZE * CAM_SIZE }, (_, cellIndex) =>
      Number(rawCams[findingIndex * CAM_SIZE * CAM_SIZE + cellIndex]),
    ),
  );

  return {
    findings,
    camMaps,
    modelId: CXR_MODEL_ID,
    modelRevision: MODEL_REVISION,
  };
}

export function activationMapDataUrl(cam: number[]) {
  const source = document.createElement("canvas");
  source.width = CAM_SIZE;
  source.height = CAM_SIZE;
  const sourceContext = source.getContext("2d");
  if (!sourceContext) throw new Error("This browser could not render the heatmap.");
  const sourcePixels = sourceContext.createImageData(CAM_SIZE, CAM_SIZE);
  for (let i = 0; i < CAM_SIZE * CAM_SIZE; i++) {
    const strength = Math.max(0, Math.min(1, cam[i] ?? 0));
    const base = i * 4;
    sourcePixels.data[base] = Math.round(255 * Math.min(1, Math.max(0, 1.5 * strength - 0.25)));
    sourcePixels.data[base + 1] = Math.round(255 * Math.min(1, Math.max(0, 1.5 - Math.abs(2 * strength - 1) * 1.5)));
    sourcePixels.data[base + 2] = Math.round(255 * Math.min(1, Math.max(0, 1.1 - 1.7 * strength)));
    sourcePixels.data[base + 3] = Math.round(255 * Math.min(1, Math.max(0, (strength - 0.15) / 0.85)) ** 0.8);
  }
  sourceContext.putImageData(sourcePixels, 0, 0);

  const output = document.createElement("canvas");
  output.width = INPUT_SIZE;
  output.height = INPUT_SIZE;
  const context = output.getContext("2d");
  if (!context) throw new Error("This browser could not render the heatmap.");
  context.imageSmoothingEnabled = true;
  context.drawImage(source, 0, 0, INPUT_SIZE, INPUT_SIZE);
  return output.toDataURL("image/png");
}
