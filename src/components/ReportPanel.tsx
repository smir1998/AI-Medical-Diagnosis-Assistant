interface Props {
  symptom?: any;
  image?: any;
  patient?: any;
}

export function ReportPanel({ symptom, image, patient }: Props) {
  if (!symptom && !image) return null;

  const reportId = `PT-${new Date().toISOString().slice(0, 10).replace(/-/g, "").slice(2)}-${Date.now().toString(36).toUpperCase().slice(-4)}`;
  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="space-y-3">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-black tracking-tight">
          Patient analysis report<span className="text-alert">.</span>
        </h2>
        <button
          onClick={() => window.print()}
          className="group inline-flex items-center gap-2 border-2 border-ink bg-paper px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider transition-all duration-200 hover:-translate-y-0.5 hover:bg-ink hover:text-paper"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d="M6 9V3h12v6M6 17H4a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2M6 14h12v7H6v-7z" />
          </svg>
          Print / PDF
        </button>
      </div>

      <div className="report-card border-2 border-ink bg-paper shadow-[9px_9px_0_0_rgba(12,43,43,0.9)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink bg-pine px-5 py-4 text-paper">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center bg-teal">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <path d="M2 12h4l3-8 4 16 3-8h6" />
              </svg>
            </span>
            <div>
              <p className="font-display text-base font-black tracking-tight">MedLens·AI — Patient Analysis Report</p>
              <p className="font-mono text-[9px] tracking-[0.24em] text-mint/70">DECISION-SUPPORT DOCUMENT · NOT A CLINICAL DIAGNOSIS</p>
            </div>
          </div>
          <div className="text-right font-mono text-[10px] leading-relaxed text-paper/70">
            <p>ID: {reportId}</p>
            <p>DATE: {today}</p>
          </div>
        </div>

        {patient && (
          <div className="flex flex-wrap items-center gap-x-8 gap-y-1 border-b border-ink/20 bg-paperdeep/60 px-5 py-2.5 font-mono text-[11px]">
            <p>
              <span className="text-inksoft">PATIENT&nbsp;&nbsp;:</span>{" "}
              <span className="font-bold text-ink">{patient.name}</span> · {patient.age}y {patient.sex}
            </p>
            <p>
              <span className="text-inksoft">MRN&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</span> {patient.id}
            </p>
            <p>
              <span className="text-inksoft">TRIAGE&nbsp;&nbsp;&nbsp;&nbsp;:</span>{" "}
              <span className="font-bold">Level {patient.triage}</span>
            </p>
          </div>
        )}

        <div className="grid gap-0 md:grid-cols-[1.1fr_0.9fr]">
          <div className="border-ink/15 px-5 py-4 md:border-r">
            <p className="mb-3 font-mono text-[10px] font-bold tracking-[0.28em] text-teal">── FINDINGS</p>

            {symptom && (
              <div className="space-y-2 font-mono text-xs leading-relaxed">
                <p>
                  <span className="text-inksoft">SYMPTOMS&nbsp;&nbsp;:</span>{" "}
                  {symptom.results[0]?.disease.name || "—"}
                </p>
                <p>
                  <span className="text-inksoft">PREDICTION :</span>{" "}
                  <span className="bg-teal px-1.5 py-0.5 font-bold text-paper">
                    {symptom.results[0]?.disease.name}
                  </span>{" "}
                  <span className="text-inksoft">({symptom.results[0]?.disease.code})</span>
                </p>
                <p>
                  <span className="text-inksoft">CONFIDENCE :</span>{" "}
                  <span className="font-bold text-teal">{symptom.results[0]?.confidence.toFixed(1)}%</span>
                </p>
              </div>
            )}

            {image && (
              <div className="mt-3 space-y-2 border-t border-dashed border-ink/25 pt-3 font-mono text-xs leading-relaxed">
                <p className="font-mono text-[10px] font-bold tracking-[0.28em] text-teal">── IMAGING · CHEST X-RAY</p>
                <p>
                  <span className="text-inksoft">STUDY&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</span> {image.fileName}
                </p>
                <p>
                  <span className="text-inksoft">FINDING&nbsp;&nbsp;&nbsp;:</span>{" "}
                  <span className={`font-bold ${Number(image.pneumonia) > 50 ? "text-alert" : "text-teal"}`}>
                    {Number(image.pneumonia) > 50 ? "Pneumonia pattern" : "No acute abnormality"}
                  </span>
                </p>
                <p>
                  <span className="text-inksoft">PROBABILITIES&nbsp;:</span> pneumonia {image.pneumonia}% / normal {image.normal}%
                </p>
              </div>
            )}
          </div>

          <div className="px-5 py-4">
            <p className="mb-3 font-mono text-[10px] font-bold tracking-[0.28em] text-alert">── RECOMMENDATION</p>
            <div className="space-y-3">
              {symptom?.results[0] && (
                <div className="border-l-2 border-teal pl-3">
                  <p className="font-display text-sm font-extrabold">Referral: {symptom.results[0].disease.specialty}</p>
                  <ul className="mt-1.5 space-y-1 pl-4 text-[13px] text-inksoft">
                    {symptom.results[0].disease.recs.map((r: string, i: number) => (
                      <li key={i} className="list-disc">{r}</li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="border border-dashed border-ink/30 bg-paperdeep/50 p-3 font-mono text-[10px] leading-relaxed text-inksoft">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1 inline h-3 w-3 text-amber">
                  <path d="M12 3L1.5 20h21L12 3zM12 9.5v5M12 17.5v.5" />
                </svg>
                Educational decision-support simulation — NOT a clinical diagnosis. A licensed clinician must confirm every finding before any care decision.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
