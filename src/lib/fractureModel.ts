export const FRACTURE_MODEL_ID = "FracAtlas ConvNeXt-Tiny s44";
export const FRACTURE_MODEL_CARD = "https://huggingface.co/akinchanJain7/fracture-detection-model";
export const FRACTURE_DATASET = "FracAtlas (CC BY 4.0)";
export const FRACTURE_THRESHOLD = 0.096791435;
const MODEL_ASSET = "models/fracatlas-fracture-int8.onnx";
const INPUT_SIZE = 384;
const CAM_SIZE = 12;
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

export interface FractureModelResult {
  score: number;
  threshold: number;
  flagged: boolean;
  camMap: number[];
  modelId: string;
  dataset: string;
}

type ProgressHandler = (percent: number) => void;
type InferenceSession = import("onnxruntime-web").InferenceSession;
let ortPromise: Promise<typeof import("onnxruntime-web")> | undefined;
let sessionPromise: Promise<InferenceSession> | undefined;

function loadOrt() {
  return (ortPromise ??= import("onnxruntime-web"));
}

async function imageToModelInput(dataUrl: string) {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  if (!width || !height || width * height > 40_000_000) {
    throw new Error("This image is too large to safely process. Choose an image under 40 megapixels.");
  }

  const scale = INPUT_SIZE / Math.max(width, height);
  const scaledWidth = Math.max(1, Math.round(width * scale));
  const scaledHeight = Math.max(1, Math.round(height * scale));
  const left = Math.floor((INPUT_SIZE - scaledWidth) / 2);
  const top = Math.floor((INPUT_SIZE - scaledHeight) / 2);
  const canvas = document.createElement("canvas");
  canvas.width = INPUT_SIZE;
  canvas.height = INPUT_SIZE;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("This browser could not decode the image pixels.");
  context.fillStyle = "#000";
  context.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE);
  context.drawImage(image, left, top, scaledWidth, scaledHeight);
  const rgba = context.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE).data;
  const input = new Float32Array(3 * INPUT_SIZE * INPUT_SIZE);
  const planeSize = INPUT_SIZE * INPUT_SIZE;
  for (let i = 0; i < planeSize; i++) {
    // Match PIL's L-mode grayscale conversion, then repeat to RGB and apply
    // the ImageNet normalization stored with the model's training pipeline.
    const gray = (rgba[i * 4] * 0.299 + rgba[i * 4 + 1] * 0.587 + rgba[i * 4 + 2] * 0.114) / 255;
    for (let channel = 0; channel < 3; channel++) {
      input[channel * planeSize + i] = (gray - MEAN[channel]) / STD[channel];
    }
  }
  return input;
}

async function createSession(onProgress?: ProgressHandler): Promise<InferenceSession> {
  const response = await fetch(`${import.meta.env.BASE_URL}${MODEL_ASSET}`);
  if (!response.ok) throw new Error(`Could not load the orthopedic X-ray model (HTTP ${response.status}).`);
  if (!response.body) throw new Error("This browser cannot stream the orthopedic X-ray model.");
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

function getSession(onProgress?: ProgressHandler) {
  if (!sessionPromise) {
    sessionPromise = createSession(onProgress).catch((error) => {
      sessionPromise = undefined;
      throw error;
    });
  }
  return sessionPromise;
}

/** Return the FracAtlas model score and Grad-CAM for an orthopedic X-ray. */
export async function scoreOrthopedicXray(dataUrl: string, onProgress?: ProgressHandler): Promise<FractureModelResult> {
  const input = await imageToModelInput(dataUrl);
  const [session, ort] = await Promise.all([getSession(onProgress), loadOrt()]);
  const output = await session.run({ image: new ort.Tensor("float32", input, [1, 3, INPUT_SIZE, INPUT_SIZE]) });
  const logits = output.logit?.data as ArrayLike<number> | undefined;
  const camValues = output.cam?.data as ArrayLike<number> | undefined;
  if (!logits || logits.length !== 1 || !camValues || camValues.length !== CAM_SIZE * CAM_SIZE) {
    throw new Error("The orthopedic X-ray model returned an unexpected result.");
  }
  const score = 1 / (1 + Math.exp(-Number(logits[0])));
  return {
    score,
    threshold: FRACTURE_THRESHOLD,
    flagged: score >= FRACTURE_THRESHOLD,
    camMap: Array.from(camValues, Number),
    modelId: FRACTURE_MODEL_ID,
    dataset: FRACTURE_DATASET,
  };
}

export const FRACTURE_CAM_SIZE = CAM_SIZE;
