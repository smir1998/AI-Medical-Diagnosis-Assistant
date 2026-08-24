import type { ImageResult, SymptomResult } from "../lib/engine";
import type { DermResult } from "./DermScan";
import { Icon } from "./ui";

interface Props {
  symptom: SymptomResult | null;
  image: ImageResult | null;
  derm?: DermResult | null;
}

export function ReportPanel({ symptom, image, derm }: Props) {
  if (!symptom && !image && !derm) return null;

  const top = symptom?.scored[0];
  const now = new Date();
  const refId = `PT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate()
  ).padStart(2, "0")}-${(symptom?.meta.runId ?? image?.runId ?? "0000")}`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-display text-sm font-extrabold uppercase tracking-wide">
          <Icon name="doc" className="h-4 w-4 text-teal" /> Generated AI report
        </h3>
        <button
          onClick={() => window.print()}
          className="no-print inline-flex items-center gap-2 border border-ink px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider transition-all duration-200 hover:bg-ink hover:text-paper hover:-translate-y-px"
        >
          <Icon name="print" className="h-3.5 w-3.5" /> Print / PDF
        </button>
      </div>

      <div className="report-card border-2 border-ink bg-paper p-5 shadow-[8px_8px_0_0_rgba(14,124,114,0.28)]">
        {/* letterhead */}
        <div className="flex items-start justify-between border-b-2 border-ink pb-3">
          <div>
            <p className="flex items-center gap-2 font-display text-base font-black tracking-tight">
              <span className="grid h-6 w-6 place-items-center bg-teal text-paper">
                <Icon name="cross" className="h-3.5 w-3.5" />
              </span>
              MEDLENS TEACHING HOSPITAL
            </p>
            <p className="mt-0.5 font-mono text-[9px] tracking-[0.24em] text-inksoft">
              DEPT. OF CLINICAL DECISION SUPPORT
            </p>
          </div>
          <div className="text-right font-mono text-[10px] leading-relaxed text-inksoft">
            <p className="font-bold text-ink">{refId}</p>
            <p>{now.toLocaleDateString("en-GB")}</p>
            <p>{now.toLocaleTimeString("en-GB")}</p>
          </div>
        </div>

        <p className="mt-3 font-mono text-[10px] font-bold tracking-[0.28em] text-teal">
          ── PATIENT ANALYSIS REPORT
        </p>

        {/* symptom findings */}
        {symptom && top && (
          <div className="mt-3 space-y-2 font-mono text-xs leading-relaxed">
            <p>
              <span className="text-inksoft">SYMPTOMS&nbsp;&nbsp;:</span>{" "}
              <span className="font-semibold">{symptom.meta.symptomLabels.join(", ")}</span>
            </p>
            <p>
              <span className="text-inksoft">DURATION&nbsp;&nbsp;:</span> {symptom.meta.duration}
              <span className="mx-2 text-ink/30">|</span>
              <span className="text-inksoft">SEVERITY :</span> {symptom.meta.severity}/10
            </p>
            <p>
              <span className="text-inksoft">PREDICTION :</span>{" "}
              <span className="bg-teal px-1.5 py-0.5 font-bold text-paper">{top.disease.name}</span>{" "}
              <span className="text-inksoft">({top.disease.code})</span>
            </p>
            <p>
              <span className="text-inksoft">CONFIDENCE :</span>{" "}
              <span className="font-bold text-teal">{top.confidence.toFixed(1)}%</span>
              <span className="ml-2 inline-block h-1.5 w-28 translate-y-[-1px] bg-ink/10 align-middle">
                <span className="bar-fill block h-full bg-teal" style={{ width: `${Math.min(99, top.confidence * 2.2)}%` }} />
              </span>
            </p>
            <p>
              <span className="text-inksoft">ALSO RULE&nbsp;:</span>{" "}
              {symptom.scored
                .slice(1, 3)
                .map((s) => `${s.disease.name} ${s.confidence.toFixed(1)}%`)
                .join(" · ")}
            </p>
            {symptom.redFlags.length > 0 && (
              <p className="border border-alert/50 bg-alert/10 px-2 py-1.5 font-bold text-alertdeep">
                ⚠ RED FLAG: {symptom.redFlags[0]}
              </p>
            )}
          </div>
        )}

        {/* imaging findings */}
        {image && (
          <div className="mt-3 space-y-2 border-t border-dashed border-ink/25 pt-3 font-mono text-xs leading-relaxed">
            <p className="font-mono text-[10px] font-bold tracking-[0.28em] text-teal">── IMAGING · CHEST X-RAY</p>
            <p>
              <span className="text-inksoft">STUDY&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</span> {image.fileName}
              <span className="ml-2 text-inksoft">(run {image.runId})</span>
            </p>
            <p>
              <span className="text-inksoft">FINDING&nbsp;&nbsp;&nbsp;:</span>{" "}
              <span className={`font-bold ${image.pneumonia > 50 ? "text-alert" : "text-teal"}`}>
                {image.pneumonia > 50 ? "Pneumonia pattern" : "No acute abnormality"}
              </span>{" "}
              — pneumonia {image.pneumonia.toFixed(1)}% / normal {image.normal.toFixed(1)}%
            </p>
          </div>
        )}

        {/* dermatology screening */}
        {derm && (
          <div className="mt-3 space-y-2 border-t border-dashed border-ink/25 pt-3 font-mono text-xs leading-relaxed">
            <p className="font-mono text-[10px] font-bold tracking-[0.28em] text-teal">
              ── SCREENING · DERMATOSCOPY
            </p>
            <p>
              <span className="text-inksoft">STUDY&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</span> {derm.fileName}
            </p>
            <p>
              <span className="text-inksoft">PROFILE&nbsp;&nbsp;&nbsp;:</span>{" "}
              <span
                className={`font-bold ${
                  derm.melanoma >= 35 ? "text-alert" : derm.atypical >= 35 ? "text-amber" : "text-teal"
                }`}
              >
                {derm.melanoma >= 35
                  ? "Melanoma-pattern risk"
                  : derm.atypical >= 35
                    ? "Atypical nevus pattern"
                    : "Benign pattern"}
              </span>{" "}
              — benign {derm.benign.toFixed(1)}% / atypical {derm.atypical.toFixed(1)}% / melanoma{" "}
              {derm.melanoma.toFixed(1)}%
            </p>
            <p>
              <span className="text-inksoft">ABCDE&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</span>{" "}
              {derm.flags.map((f) => `${f.key}${f.status === "warn" ? "▲" : "✓"}`).join("  ")}
            </p>
          </div>
        )}

        {/* recommendation + referral */}
        {top && (
          <div className="mt-3 border-t border-dashed border-ink/25 pt-3">
            <p className="font-mono text-[10px] font-bold tracking-[0.28em] text-teal">── RECOMMENDATION</p>
            <ul className="mt-1.5 list-inside space-y-1 font-mono text-xs leading-relaxed">
              {top.disease.recs.map((r) => (
                <li key={r} className="flex gap-1.5">
                  <span className="text-teal">+</span> {r}
                </li>
              ))}
              <li className="flex gap-1.5 font-semibold">
                <span className="text-teal">+</span> Recommended referral: {top.disease.specialty}.
              </li>
            </ul>
          </div>
        )}

        <p className="mt-4 border-t-2 border-ink pt-2 font-mono text-[9px] leading-relaxed text-inksoft">
          EDUCATIONAL SIMULATION — generated by a teaching model. Not a diagnosis, not medical advice.
          Consult a licensed healthcare professional. In an emergency, call your local emergency number.
        </p>
        <p className="mt-1.5 font-mono text-[9px] tracking-[0.2em] text-inksoft/70">
          SIGNED: MEDLENS-AI v3.2 · ATTENDING: [ PHYSICIAN REVIEW REQUIRED ]
        </p>
      </div>
    </div>
  );
}
