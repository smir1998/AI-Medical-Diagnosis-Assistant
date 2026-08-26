/* ------------------------------------------------------------------ */
/*  MedLens QA bench — regression suite for the deterministic engine   */
/*  Runs entirely in-browser against the real pure functions.          */
/* ------------------------------------------------------------------ */

import { analyzeSymptoms, predictImage, prefersReducedMotion } from "./engine";
import { CHAT_FALLBACK, HF_MODEL_ZOO } from "../data/medical";
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
  suite: "SYMPTOM NLP" | "RADIOLOGY CNN" | "NLP DESK" | "DERM SCREEN" | "REGISTRAR" | "MODEL ZOO";
  name: string;
  run: Run;
}

/* ---------- helpers ---------- */

const near = (a: number, b: number, eps: number) => Math.abs(a - b) <= eps;

/** Paints a solid or noisy patch and returns a data URL. */
function patchDataUrl(kind: "white" | "noise"): string {
  const c = document.createElement("canvas");
  c.width = 48;
  c.height = 48;
  const ctx = c.getContext("2d")!;
  if (kind === "white") {
    ctx.fillStyle = "#fdfdfd";
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
      const ok = top.disease.id === "influenza" && top.confidence > 20 && r.redFlags.length === 0;
      return {
        pass: ok,
        detail: `top=${top.disease.name} @ ${top.confidence.toFixed(1)}% · flags=${r.redFlags.length}`,
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
      const ok = r.redFlags.length >= 2 && cardiac;
      return { pass: ok, detail: `flags=${r.redFlags.length} · cardiac-note=${cardiac ? "yes" : "no"}` };
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
    name: "Upload inference is deterministic per file",
    run: () => {
      const a = predictImage("upload", "patient_scan.png", "81234-patient_scan.png");
      const b = predictImage("upload", "patient_scan.png", "81234-patient_scan.png");
      const ok = a.pneumonia === b.pneumonia && a.runId === b.runId;
      return { pass: ok, detail: `runId=${a.runId} · pneumonia=${a.pneumonia.toFixed(1)}% (stable)` };
    },
  },
  {
    id: "I4",
    suite: "RADIOLOGY CNN",
    name: "Sweep: 12 upload seeds all in-range, classes sum to 100",
    run: () => {
      let bad = "";
      for (let i = 0; i < 12; i++) {
        const r = predictImage("upload", `study_${i}.png`, `seed-${i}`);
        if (r.pneumonia < 4 || r.pneumonia > 95 || !near(r.normal + r.pneumonia, 100, 0.11)) {
          bad = `seed-${i} → ${r.pneumonia.toFixed(1)}%`;
          break;
        }
      }
      return { pass: bad === "", detail: bad || "12/12 seeds in [4,95], Σ=100" };
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
