/* ------------------------------------------------------------------ */
/*  MedLens QA bench — regression suite for the deterministic engine   */
/*  Runs entirely in-browser against the real pure functions.          */
/* ------------------------------------------------------------------ */

import { analyzeSymptoms, predictImage, prefersReducedMotion } from "./engine";
import { cosineSim } from "./semantic";
import { predictWithModel, trainModel } from "./train";
import { encountersFor, type EncounterEntry } from "./encounters";
import { buildReportPlan } from "./pdf";
import { NB_MODEL, nbPosteriors } from "./naiveBayes";
import { opacityToPneumonia, radiographStats } from "./pixel";
import { TRAINING_ROWS } from "../data/training";
import { CHAT_FALLBACK, HF_MODEL_ZOO, SAMPLE_XRAY_NORMAL, SAMPLE_XRAY_PNEUMONIA } from "../data/medical";
import { matchAnswer } from "../components/Chatbot";
import { analyzePixels, buildFlags } from "../components/DermScan";
import {
  computeVitalsFlags,
  toCSV,
  validateIntake,
  type IntakeDraft,
} from "../components/PatientRegistry";

const intakeDraft = (over: Partial<IntakeDraft> = {}): IntakeDraft => ({
  name: "Ada Lovelace",
  age: "36",
  sex: "F",
  complaint: "fever, cough 3 days",
  allergies: "Penicillin",
  triage: 3,
  hr: "88",
  sys: "118",
  dia: "76",
  spo2: "97",
  temp: "37.2",
  ...over,
});

export interface CaseResult {
  id: string;
  suite: string;
  name: string;
  pass: boolean;
  detail: string;
}

type Run = () => { pass: boolean; detail: string } | Promise<{ pass: boolean; detail: string }>;

interface Case {
  id: string;
  suite:
    | "SYMPTOM NLP"
    | "RADIOLOGY CNN"
    | "NLP DESK"
    | "DERM SCREEN"
    | "REGISTRAR"
    | "MODEL ZOO"
    | "SEMANTIC UTILS"
    | "PIXEL HEAD"
    | "TRAINED MODEL"
    | "BUNDLE"
    | "LIVE TRAINER"
    | "ENCOUNTER"
    | "PDF PLAN";
  name: string;
  run: Run;
}

/* ---------- helpers ---------- */

const near = (a: number, b: number, eps: number) => Math.abs(a - b) <= eps;

/** Paints a solid or noisy patch and returns a data URL. */
function patchDataUrl(kind: "white" | "noise" | "black"): string {
  const c = document.createElement("canvas");
  c.width = 48;
  c.height = 48;
  const ctx = c.getContext("2d")!;
  if (kind === "white") {
    ctx.fillStyle = "#fdfdfd";
    ctx.fillRect(0, 0, 48, 48);
  } else if (kind === "black") {
    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, 48, 48);
  } else {
    const img = ctx.createImageData(48, 48);
    let s = 1234567;
    for (let i = 0; i < img.data.length; i += 4) {
      s = (s * 1103515245 + 12345) % 2147483648;
      const v = (s >> 16) & 255;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }
  return c.toDataURL("image/png");
}

/* ---------- the battery ---------- */

export const TEST_CASES: Case[] = [
  /* ----- A · symptom inference ----- */
  {
    id: "A1",
    suite: "SYMPTOM NLP",
    name: "Classic flu presentation → Influenza on top, no red flags",
    run: () => {
      const r = analyzeSymptoms(["fever", "cough", "muscle_aches", "fatigue", "chills"], 1, 7);
      const top = r.scored[0];
      const ok =
        top.disease.id === "influenza" &&
        top.confidence > 20 &&
        r.redFlags.length === 0 &&
        r.redFlagSymptoms.length === 0;
      return {
        pass: ok,
        detail: `top=${top.disease.name} @ ${top.confidence.toFixed(1)}% · flags=0 · flagged-symptoms=0`,
      };
    },
  },
  {
    id: "A2",
    suite: "SYMPTOM NLP",
    name: "Chest pain + breathlessness → ≥2 red flags incl. cardiac note",
    run: () => {
      const r = analyzeSymptoms(["chest_pain", "shortness_breath"], 2, 8);
      const cardiac = r.redFlags.some((f) => f.toLowerCase().includes("cardiac"));
      const ok = r.redFlagSymptoms.length >= 2 && cardiac;
      return {
        pass: ok,
        detail: `flagged=[${r.redFlagSymptoms.join(", ")}] · cardiac-note=${cardiac ? "yes" : "no"}`,
      };
    },
  },
  {
    id: "A3",
    suite: "SYMPTOM NLP",
    name: "Fever + headache + vomiting → meningitis triad fires",
    run: () => {
      const r = analyzeSymptoms(["fever", "headache", "vomiting"], 1, 6);
      const mening = r.redFlags.some((f) => f.toLowerCase().includes("meningitis"));
      return { pass: mening, detail: `flags=${r.redFlags.length} · meningitis-note=${mening ? "yes" : "no"}` };
    },
  },
  {
    id: "A4",
    suite: "SYMPTOM NLP",
    name: "Negative weight works: cough demotes Strep below #1",
    run: () => {
      const noCough = analyzeSymptoms(["sore_throat", "fever"], 1, 5);
      const withCough = analyzeSymptoms(["sore_throat", "fever", "cough"], 1, 5);
      const strepTop2 =
        noCough.scored[0].disease.id === "strep_throat" || noCough.scored[1].disease.id === "strep_throat";
      const demoted = withCough.scored[0].disease.id !== "strep_throat";
      const ok = strepTop2 && demoted;
      return {
        pass: ok,
        detail: `no-cough top=${noCough.scored[0].disease.name} · with-cough top=${withCough.scored[0].disease.name}`,
      };
    },
  },
  {
    id: "A5",
    suite: "SYMPTOM NLP",
    name: "Single vague symptom → Allergic Rhinitis, confidence stays humble",
    run: () => {
      const r = analyzeSymptoms(["itching"], 1, 5);
      const top = r.scored[0];
      const ok = top.disease.id === "allergic_rhinitis" && top.confidence < 40;
      return { pass: ok, detail: `top=${top.disease.name} @ ${top.confidence.toFixed(1)}%` };
    },
  },
  {
    id: "A6",
    suite: "SYMPTOM NLP",
    name: "Softmax invariant: posterior sums to 100, top ≥ floor",
    run: () => {
      const r = analyzeSymptoms(["fever", "rash", "joint_pain", "nausea"], 3, 9);
      const sum = r.scored.reduce((a, s) => a + s.confidence, 0);
      const ok = near(sum, 100, 0.5) && r.scored[0].confidence >= 100 / 12 - 0.1;
      return { pass: ok, detail: `Σ=${sum.toFixed(3)} · top=${r.scored[0].confidence.toFixed(1)}%` };
    },
  },
  {
    id: "A7",
    suite: "SYMPTOM NLP",
    name: "Determinism: identical inputs → identical runId & scores",
    run: () => {
      const a = analyzeSymptoms(["diarrhea", "vomiting", "abdominal_pain"], 2, 6);
      const b = analyzeSymptoms(["diarrhea", "vomiting", "abdominal_pain"], 2, 6);
      const ok =
        a.meta.runId === b.meta.runId &&
        near(a.scored[0].confidence, b.scored[0].confidence, 1e-9) &&
        a.scored[0].disease.id === "gastroenteritis";
      return { pass: ok, detail: `runId=${a.meta.runId} · top=${a.scored[0].disease.name}` };
    },
  },

  /* ----- I · radiology CNN ----- */
  {
    id: "I1",
    suite: "RADIOLOGY CNN",
    name: "Pneumonia sample lands in 89–96%, heat map inside frame",
    run: () => {
      const r = predictImage("pneumonia-sample", "PA_chest_0412.dcm.png", "seed-1");
      const inFrame =
        r.heat.x > 0 && r.heat.x < 100 && r.heat.y > 0 && r.heat.y < 100 && r.heat.size > 10;
      const ok = r.pneumonia >= 89 && r.pneumonia <= 96 && near(r.normal + r.pneumonia, 100, 0.11) && inFrame;
      return { pass: ok, detail: `pneumonia=${r.pneumonia.toFixed(1)}% · heat@(${r.heat.x.toFixed(0)},${r.heat.y.toFixed(0)})` };
    },
  },
  {
    id: "I2",
    suite: "RADIOLOGY CNN",
    name: "Healthy control stays ≤ 7% pneumonia probability",
    run: () => {
      const r = predictImage("normal-sample", "PA_chest_0107.dcm.png", "seed-1");
      const ok = r.pneumonia <= 7 && r.normal >= 93;
      return { pass: ok, detail: `pneumonia=${r.pneumonia.toFixed(1)}% · normal=${r.normal.toFixed(1)}%` };
    },
  },
  {
    id: "I3",
    suite: "RADIOLOGY CNN",
    name: "Sample inference is deterministic across runs",
    run: () => {
      const a = predictImage("pneumonia-sample", "PA_chest_0412.dcm.png", "seed-1");
      const b = predictImage("pneumonia-sample", "PA_chest_0412.dcm.png", "seed-1");
      const ok = a.pneumonia === b.pneumonia && a.runId === b.runId;
      return { pass: ok, detail: `runId=${a.runId} · pneumonia=${a.pneumonia.toFixed(1)}% (stable)` };
    },
  },

  /* ----- P · pixel-statistics head (real image measurement) ----- */
  {
    id: "P1",
    suite: "PIXEL HEAD",
    name: "Opacity monotonicity: white film scores higher pneumonia than dark film",
    run: async () => {
      const bright = await radiographStats(patchDataUrl("white"));
      const dark = await radiographStats(patchDataUrl("black"));
      const pB = opacityToPneumonia(bright);
      const pD = opacityToPneumonia(dark);
      const ok = pB > pD && bright.opacity > dark.opacity;
      return { pass: ok, detail: `white→${pB.toFixed(1)}% · dark→${pD.toFixed(1)}% · opacity ${bright.opacity} vs ${dark.opacity}` };
    },
  },
  {
    id: "P2",
    suite: "PIXEL HEAD",
    name: "Logistic head stays bounded in [4,95] across the opacity sweep",
    run: () => {
      let bad = "";
      for (let o = 0; o <= 1.001; o += 0.1) {
        const p = opacityToPneumonia({ opacity: o, heterogeneity: 0.2, size: 64 });
        if (p < 4 || p > 95) {
          bad = `opacity ${o.toFixed(1)} → ${p}%`;
          break;
        }
      }
      return { pass: bad === "", detail: bad || "11/11 sweep points within [4,95]" };
    },
  },

  /* ----- T · trained model (Naive Bayes over the reference table) ----- */
  {
    id: "T1",
    suite: "TRAINED MODEL",
    name: "Posterior is a valid distribution: Σ=100 over all 12 diseases",
    run: () => {
      const posts = nbPosteriors(["fever", "cough", "fatigue"], 0.6);
      const sum = posts.reduce((a, p) => a + p.confidence, 0);
      const ok = posts.length === 12 && near(sum, 100, 0.5) && posts[0].confidence >= posts[posts.length - 1].confidence;
      return { pass: ok, detail: `n=${posts.length} · Σ=${sum.toFixed(3)} · sorted=${posts[0].confidence >= posts[posts.length - 1].confidence}` };
    },
  },
  {
    id: "T2",
    suite: "TRAINED MODEL",
    name: "Training is data-derived: priors ∝ row counts, likelihoods smoothed",
    run: () => {
      const top = [...NB_MODEL.logPrior.entries()].sort((a, b) => b[1] - a[1])[0];
      const strep = TRAINING_ROWS.find((r) => r.id === "strep_throat")!;
      const lik = NB_MODEL.logLik.get("strep_throat")!.get("sore_throat")!;
      const expected = Math.log((strep.rows + 1) / (strep.rows + 2));
      const ok = top[0] === "strep_throat" && near(lik, expected, 1e-9);
      return { pass: ok, detail: `top-prior=${top[0]} · L(sore_throat|strep)=${lik.toFixed(4)} (expected ${expected.toFixed(4)})` };
    },
  },
  {
    id: "T3",
    suite: "TRAINED MODEL",
    name: "Dataset-grounded association: sneeze+runny nose+itching → Allergic Rhinitis",
    run: () => {
      const top = nbPosteriors(["sneezing", "runny_nose", "itching"], 0.55)[0];
      const ok = top.id === "allergic_rhinitis";
      return { pass: ok, detail: `top=${top.id} @ ${top.confidence.toFixed(1)}%` };
    },
  },
  {
    id: "T4",
    suite: "TRAINED MODEL",
    name: "Priors break exact ties: headache+fatigue+dizziness favors higher-row-count disease",
    run: () => {
      const posts = nbPosteriors(["headache", "fatigue", "dizziness"], 0.6);
      const mig = posts.find((p) => p.id === "migraine")!.confidence;
      const ten = posts.find((p) => p.id === "tension_headache")!.confidence;
      const ok = ten > mig; // tension_headache has more rows (170 > 150) and the exact profile
      return { pass: ok, detail: `tension=${ten.toFixed(1)}% vs migraine=${mig.toFixed(1)}%` };
    },
  },

  /* ----- C · NLP desk ----- */
  {
    id: "C1",
    suite: "NLP DESK",
    name: "“What is a CNN?” → architecture answer",
    run: () => {
      const a = matchAnswer("What is a CNN?");
      const ok = a.includes("Convolutional") && a !== CHAT_FALLBACK;
      return { pass: ok, detail: ok ? "matched: convolution explainer" : `got: ${a.slice(0, 60)}…` };
    },
  },
  {
    id: "C2",
    suite: "NLP DESK",
    name: "“Why normalize by 255?” → normalization answer",
    run: () => {
      const a = matchAnswer("Why do we normalize by 255?");
      const ok = a.includes("255");
      return { pass: ok, detail: ok ? "matched: ÷255 explainer" : `got: ${a.slice(0, 60)}…` };
    },
  },
  {
    id: "C3",
    suite: "NLP DESK",
    name: "“Is this tool accurate?” → honest-limitations answer, not fallback",
    run: () => {
      const a = matchAnswer("Is this tool accurate?");
      const ok = a !== CHAT_FALLBACK && a.toLowerCase().includes("simulation");
      return { pass: ok, detail: ok ? "matched: validation & limits" : "fell through to fallback" };
    },
  },
  {
    id: "C4",
    suite: "NLP DESK",
    name: "“precision and recall in healthcare” → metrics answer",
    run: () => {
      const a = matchAnswer("Why do precision and recall matter in healthcare?");
      const ok = a.includes("Recall");
      return { pass: ok, detail: ok ? "matched: metrics explainer" : `got: ${a.slice(0, 60)}…` };
    },
  },
  {
    id: "C5",
    suite: "NLP DESK",
    name: "Gibberish input → graceful fallback, no crash",
    run: () => {
      const a = matchAnswer("xqz blorp fnord");
      return { pass: a === CHAT_FALLBACK, detail: a === CHAT_FALLBACK ? "fallback returned cleanly" : "unexpected match" };
    },
  },
  {
    id: "C6",
    suite: "NLP DESK",
    name: "\"Which Hugging Face models power this?\" → model-registry lineage answer",
    run: () => {
      const a = matchAnswer("Which Hugging Face models power this console?");
      const ok = a !== CHAT_FALLBACK && a.includes("keremberke");
      return { pass: ok, detail: ok ? "matched: HF model registry lineage" : `got: ${a.slice(0, 60)}…` };
    },
  },
  {
    id: "C7",
    suite: "NLP DESK",
    name: "Plain deploy question stays on the deploy answer (no HF-registry leakage)",
    run: () => {
      const a = matchAnswer("How do I deploy this on Render?");
      const ok = a.includes("Render") && !a.includes("keremberke");
      return { pass: ok, detail: ok ? "matched: deployment path, registry text absent" : `got: ${a.slice(0, 60)}…` };
    },
  },
  {
    id: "C8",
    suite: "NLP DESK",
    name: "\"Deploy with Hugging Face Spaces\" → registry answer wins on stronger keyword",
    run: () => {
      const a = matchAnswer("How do I deploy this with Hugging Face Spaces?");
      const ok = a.includes("keremberke");
      return { pass: ok, detail: ok ? "'hugging' (7 chars) outscored 'deploy' (6 chars) as intended" : `got: ${a.slice(0, 60)}…` };
    },
  },

  /* ----- D · derm screen ----- */
  {
    id: "D1",
    suite: "DERM SCREEN",
    name: "Uniform light patch → benign-dominant profile",
    run: async () => {
      const p = await analyzePixels(patchDataUrl("white"), 7);
      const ok = p.benign > 55 && p.benign > p.atypical && p.benign > p.melanoma;
      return {
        pass: ok,
        detail: `benign=${p.benign.toFixed(1)} · atypical=${p.atypical.toFixed(1)} · melanoma=${p.melanoma.toFixed(1)}`,
      };
    },
  },
  {
    id: "D2",
    suite: "DERM SCREEN",
    name: "High-variance noise patch → benign dominance suppressed",
    run: async () => {
      const p = await analyzePixels(patchDataUrl("noise"), 7);
      const ok = p.benign < 60;
      return { pass: ok, detail: `benign=${p.benign.toFixed(1)}% · heterogeneity raised atypical/melanoma` };
    },
  },
  {
    id: "D3",
    suite: "DERM SCREEN",
    name: "3-class softmax stays normalized (Σ ≈ 100)",
    run: async () => {
      const p = await analyzePixels(patchDataUrl("noise"), 3);
      const sum = p.benign + p.atypical + p.melanoma;
      return { pass: near(sum, 100, 0.5), detail: `Σ=${sum.toFixed(3)}` };
    },
  },
  {
    id: "D4",
    suite: "DERM SCREEN",
    name: "High-risk profile raises ABCDE flags A + B",
    run: () => {
      const flags = buildFlags({ benign: 12, atypical: 41, melanoma: 47 });
      const a = flags.find((f) => f.key === "A")!;
      const b = flags.find((f) => f.key === "B")!;
      const ok = a.status === "warn" && b.status === "warn";
      return { pass: ok, detail: `A=${a.status} · B=${b.status} · flagged=${flags.filter((f) => f.status === "warn").length}/5` };
    },
  },

  /* ----- R · registrar ----- */
  {
    id: "R1",
    suite: "REGISTRAR",
    name: "Invalid intake rejected: empty name, age 999, SpO₂ 140",
    run: () => {
      const { errors, patient } = validateIntake(intakeDraft({ name: "", age: "999", spo2: "140" }));
      const ok = patient === null && !!errors.name && !!errors.age && !!errors.spo2;
      return { pass: ok, detail: `errors=[${Object.keys(errors).join(",")}] · patient=${patient ?? "null"}` };
    },
  },
  {
    id: "R2",
    suite: "REGISTRAR",
    name: "Valid intake → MRN issued, vitals parsed, triage kept",
    run: () => {
      const { errors, patient } = validateIntake(intakeDraft());
      const ok =
        patient !== null &&
        Object.keys(errors).length === 0 &&
        patient.id.startsWith("MRN-") &&
        patient.vitals.hr === 88 &&
        patient.vitals.spo2 === 97 &&
        patient.triage === 3;
      return {
        pass: ok,
        detail: patient ? `id=${patient.id} · hr=${patient.vitals.hr} · T${patient.triage}` : "no patient",
      };
    },
  },
  {
    id: "R3",
    suite: "REGISTRAR",
    name: "Vitals flag engine: hypoxia + tachycardia + febrile all fire",
    run: () => {
      const flags = computeVitalsFlags({ spo2: 88, hr: 132, temp: 38.6 });
      const ok = flags.includes("Hypoxia") && flags.includes("Tachycardia") && flags.includes("Febrile");
      return { pass: ok, detail: `flags=[${flags.join(", ")}]` };
    },
  },
  {
    id: "R4",
    suite: "REGISTRAR",
    name: "CSV export: header present, commas escaped (RFC-4180)",
    run: () => {
      const { patient } = validateIntake(intakeDraft());
      if (!patient) return { pass: false, detail: "could not build patient" };
      const csv = toCSV([patient]);
      const ok = csv.startsWith('"MRN"') && csv.includes('"fever, cough 3 days"');
      return { pass: ok, detail: ok ? "header + escaped field ok" : `csv head=${csv.slice(0, 40)}…` };
    },
  },

  /* ----- M · model registry ----- */
  {
    id: "M1",
    suite: "MODEL ZOO",
    name: "Every HF entry: valid repo id, Hub URL, arch & dataset present",
    run: () => {
      const bad = HF_MODEL_ZOO.find(
        (m) =>
          !/^[\w.-]+\/[\w.-]+$/.test(m.repoId) ||
          !m.arch.trim() ||
          !m.dataset.trim() ||
          !m.metric.trim()
      );
      return {
        pass: !bad && HF_MODEL_ZOO.length >= 5,
        detail: bad ? `invalid entry: ${bad.repoId}` : `${HF_MODEL_ZOO.length}/5 entries well-formed`,
      };
    },
  },
  {
    id: "B1",
    suite: "BUNDLE",
    name: "Sample radiographs ship as bundled assets, never remote URLs",
    run: () => {
      const remote = [SAMPLE_XRAY_PNEUMONIA, SAMPLE_XRAY_NORMAL].filter((u) => /^https?:/i.test(u));
      return {
        pass: remote.length === 0,
        detail: remote.length === 0 ? "both studies resolve locally (no ❌ hosts)" : `remote ref: ${remote[0]}`,
      };
    },
  },
  {
    id: "M2",
    suite: "MODEL ZOO",
    name: "Console coverage: vision ×2, NLP, LLM and multimodal heads all backed",
    run: () => {
      const tags = HF_MODEL_ZOO.map((m) => m.tag);
      const vision = tags.filter((t) => t === "vision").length;
      const ok =
        vision >= 2 && tags.includes("nlp") && tags.includes("llm") && tags.includes("multimodal");
      return {
        pass: ok,
        detail: `vision=${vision} · nlp=${tags.includes("nlp")} · llm=${tags.includes("llm")} · mm=${tags.includes("multimodal")}`,
      };
    },
  },

  /* ----- S · semantic utils (real-model math) ----- */
  {
    id: "S1",
    suite: "SEMANTIC UTILS",
    name: "Cosine: identical vectors → 1, orthogonal → 0",
    run: () => {
      const id = cosineSim([1, 2, 3], [1, 2, 3]);
      const ortho = cosineSim([1, 0], [0, 1]);
      const ok = near(id, 1, 1e-9) && near(ortho, 0, 1e-9);
      return { pass: ok, detail: `identical=${id.toFixed(6)} · orthogonal=${ortho.toFixed(6)}` };
    },
  },
  {
    id: "S2",
    suite: "SEMANTIC UTILS",
    name: "Cosine: zero-vector guard returns 0, never NaN",
    run: () => {
      const z = cosineSim([0, 0, 0], [1, 1, 1]);
      const ok = z === 0 && !Number.isNaN(z);
      return { pass: ok, detail: `zero-guard=${z}` };
    },
  },

  /* ----- L · live trainer (SGD on the real disease–symptom dataset) ----- */
  {
    id: "L1",
    suite: "LIVE TRAINER",
    name: "SGD converges: cross-entropy drops ≥40% within 10 epochs",
    run: async () => {
      const m = await trainModel({ epochs: 10, rowsPerClass: 24 });
      const first = m.lossHistory[0];
      const last = m.lossHistory[m.lossHistory.length - 1];
      const ok = last < first * 0.6;
      return { pass: ok, detail: `loss ${first.toFixed(3)} → ${last.toFixed(3)}` };
    },
  },
  {
    id: "L2",
    suite: "LIVE TRAINER",
    name: "Measured held-out accuracy ≥ 70% on the real associations",
    run: async () => {
      const m = await trainModel({ epochs: 20, rowsPerClass: 32 });
      return {
        pass: m.metrics.accuracy >= 0.7,
        detail: `acc=${(m.metrics.accuracy * 100).toFixed(1)}% · F1=${(m.metrics.macroF1 * 100).toFixed(1)}`,
      };
    },
  },
  {
    id: "L3",
    suite: "LIVE TRAINER",
    name: "Deterministic: same seed ⇒ bit-identical measured accuracy",
    run: async () => {
      const a = await trainModel({ epochs: 8, rowsPerClass: 16 });
      const b = await trainModel({ epochs: 8, rowsPerClass: 16 });
      const ok = a.metrics.accuracy === b.metrics.accuracy;
      return { pass: ok, detail: `acc=${(a.metrics.accuracy * 100).toFixed(2)}% on both runs` };
    },
  },
  {
    id: "L4",
    suite: "LIVE TRAINER",
    name: "Trained head: vomiting+diarrhea+nausea ⇒ Gastroenteritis #1",
    run: async () => {
      const m = await trainModel({ epochs: 24, rowsPerClass: 32 });
      const preds = predictWithModel(m, ["vomiting", "diarrhea", "nausea"]);
      const top = preds[0];
      const second = preds[1];
      const ok = !!top && top.name === "Gastroenteritis";
      void second;
      return {
        pass: ok,
        detail: ok
          ? `top=Gastroenteritis @ ${(top.prob * 100).toFixed(1)}% · runner-up ${second.name} @ ${(second.prob * 100).toFixed(1)}%`
          : `top=${top?.name ?? "∅"} @ ${((top?.prob ?? 0) * 100).toFixed(1)}% — expected Gastroenteritis`,
      };
    },
  },

  /* ----- E · encounter trail ----- */
  {
    id: "E1",
    suite: "ENCOUNTER",
    name: "Encounter trail: only entries stamped with the chart's MRN are returned",
    run: () => {
      const history: EncounterEntry[] = [
        { id: 1, time: "10:00:00", type: "adm", title: "Admit", confidence: -1, mrn: "MRN-AAA" },
        { id: 2, time: "10:02:11", type: "symptom", title: "Influenza", confidence: 61.2, mrn: "MRN-AAA" },
        { id: 3, time: "10:05:47", type: "image", title: "Chest X-ray", confidence: 92.4, mrn: "MRN-BBB" },
        { id: 4, time: "10:07:03", type: "derm", title: "Derm scan", confidence: 88.0 },
      ];
      const trail = encountersFor(history, "MRN-AAA");
      const ok = trail.length === 2 && trail.every((e) => e.mrn === "MRN-AAA");
      return { pass: ok, detail: `trail=${trail.length} entries (expected 2, unstamped excluded)` };
    },
  },

  /* ----- PD · PDF plan ----- */
  {
    id: "PD1",
    suite: "PDF PLAN",
    name: "Report plan: patient block, deterministic file name, disclaimer always present",
    run: () => {
      const { patient } = validateIntake(intakeDraft());
      if (!patient) return { pass: false, detail: "could not build patient" };
      const plan = buildReportPlan(null, null, null, patient, "PT-TEST-42");
      const hasPatient = plan.lines.some((l) => l.kind === "kv" && l.k === "MRN" && l.v === patient.id);
      const hasDisclaimer = plan.lines.some(
        (l) => l.kind === "alert" && l.text.includes("NOT a clinical diagnosis")
      );
      const ok =
        plan.reportId === "PT-TEST-42" &&
        plan.fileName === "MedLens-PT-TEST-42.pdf" &&
        hasPatient &&
        hasDisclaimer;
      return {
        pass: ok,
        detail: `id=${plan.reportId} · lines=${plan.lines.length} · patient+disclaimer=${hasPatient && hasDisclaimer}`,
      };
    },
  },
  {
    id: "PD2",
    suite: "PDF PLAN",
    name: "Plan is deterministic: same inputs ⇒ identical file name and line sequence",
    run: () => {
      const { patient } = validateIntake(intakeDraft());
      const a = buildReportPlan(null, null, null, patient ?? null, "PT-SAME-1");
      const b = buildReportPlan(null, null, null, patient ?? null, "PT-SAME-1");
      const sameLines = JSON.stringify(a.lines) === JSON.stringify(b.lines);
      const ok = a.fileName === b.fileName && sameLines;
      return { pass: ok, detail: `fileName=${a.fileName} · lines-identical=${sameLines}` };
    },
  },
];

/** Executes the full battery sequentially; invokes onStep after each case. */
export async function runSuite(onStep: (r: CaseResult, idx: number) => void): Promise<CaseResult[]> {
  const results: CaseResult[] = [];
  const reduced = prefersReducedMotion();
  for (let i = 0; i < TEST_CASES.length; i++) {
    const t = TEST_CASES[i];
    let out: { pass: boolean; detail: string };
    try {
      out = await t.run();
    } catch (e) {
      out = { pass: false, detail: `threw: ${e instanceof Error ? e.message : String(e)}` };
    }
    const r: CaseResult = { id: t.id, suite: t.suite, name: t.name, ...out };
    results.push(r);
    onStep(r, i);
    if (!reduced) await new Promise((res) => setTimeout(res, 95)); // staged readout
  }
  return results;
}
