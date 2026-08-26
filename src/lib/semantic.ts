/* ------------------------------------------------------------------ */
/*  Real in-browser inference — Transformers.js sentence encoder       */
/*                                                                     */
/*  Loads Xenova/all-MiniLM-L6-v2 (ONNX q8, ≈22.7 MB, cached by the    */
/*  browser after first pull) and ranks the 24 indexed symptoms        */
/*  against the patient's free-text chief complaint by cosine          */
/*  similarity in 384-dim embedding space.                             */
/* ------------------------------------------------------------------ */

import { SYMPTOMS } from "../data/medical";

export const SEMANTIC_MODEL_ID = "Xenova/all-MiniLM-L6-v2";
export const EMBED_DIM = 384;
export const SIM_THRESHOLD = 0.22;

export type SemanticStatus =
  | { kind: "idle" }
  | { kind: "loading"; file: string; pct: number }
  | { kind: "live" }
  | { kind: "error"; reason: string };

export interface SemanticMatch {
  id: string;
  label: string;
  score: number; // cosine similarity 0..1 (vectors pre-normalized)
}

/* ---------- pure math (deterministic, unit-tested) ---------- */

export function cosineSim(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0; // zero-vector guard → defined, never NaN
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function rankMatches(
  ccVec: number[],
  symptomVecs: Map<string, number[]>
): SemanticMatch[] {
  const out: SemanticMatch[] = [];
  for (const [id, vec] of symptomVecs) {
    const label = SYMPTOMS.find((s) => s.id === id)?.label ?? id;
    out.push({ id, label, score: cosineSim(ccVec, vec) });
  }
  return out.sort((x, y) => y.score - x.score);
}

/* ---------- lazy runtime bridge ---------- */

type Extractor = (
  text: string,
  opts: { pooling: "mean"; normalize: boolean }
) => Promise<{ data: Float32Array | number[]; dims: number[] }>;

let extractorPromise: Promise<Extractor> | null = null;
let symptomVecs: Map<string, number[]> | null = null;

/** Loads the ONNX encoder once; progress streamed via callback. */
export function loadEmbedder(
  onProgress: (file: string, pct: number) => void
): Promise<Extractor> {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const tf = await import("@huggingface/transformers");
      tf.env.allowLocalModels = false;
      const pipe = (await tf.pipeline("feature-extraction", SEMANTIC_MODEL_ID, {
        dtype: "q8",
        progress_callback: (p: { status?: string; file?: string; progress?: number }) => {
          if (p.status === "progress" && p.file) onProgress(p.file, p.progress ?? 0);
        },
      })) as unknown as Extractor;
      return pipe;
    })().catch((e) => {
      extractorPromise = null; // allow retry after transient network failure
      throw e;
    });
  }
  return extractorPromise;
}

async function embed(pipe: Extractor, text: string): Promise<number[]> {
  const out = await pipe(text, { pooling: "mean", normalize: true });
  return Array.from(out.data as ArrayLike<number>);
}

/** Encodes the 24 symptom labels once per session (with clinical context). */
async function ensureSymptomVectors(pipe: Extractor): Promise<Map<string, number[]>> {
  if (symptomVecs) return symptomVecs;
  const map = new Map<string, number[]>();
  for (const s of SYMPTOMS) {
    map.set(s.id, await embed(pipe, `medical symptom: ${s.label.toLowerCase()}`));
  }
  symptomVecs = map;
  return map;
}

/** Full semantic pass: CC text → ranked symptom matches above threshold. */
export async function semanticMatch(
  cc: string,
  onProgress: (file: string, pct: number) => void
): Promise<SemanticMatch[]> {
  const pipe = await loadEmbedder(onProgress);
  const vecs = await ensureSymptomVectors(pipe);
  const ccVec = await embed(pipe, `patient chief complaint: ${cc.toLowerCase()}`);
  return rankMatches(ccVec, vecs).filter((m) => m.score >= SIM_THRESHOLD);
}
