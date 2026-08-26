import { useEffect, useState } from "react";
import { TEST_CASES, runSuite, type CaseResult } from "../lib/tests";
import { ECGLine, Icon } from "./ui";

export function QABench({ onClose }: { onClose: () => void }) {
  const [results, setResults] = useState<(CaseResult | null)[]>(() => TEST_CASES.map(() => null));
  const [phase, setPhase] = useState<"running" | "done">("running");
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const t0 = performance.now();
    setResults(TEST_CASES.map(() => null));
    setPhase("running");
    setElapsed(0);
    runSuite((r, i) => {
      if (cancelled) return;
      setResults((prev) => {
        const next = [...prev];
        next[i] = r;
        return next;
      });
      setElapsed((performance.now() - t0) / 1000);
    }).then(() => {
      if (!cancelled) setPhase("done");
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const passed = results.filter((r) => r?.pass).length;
  const failed = results.filter((r) => r && !r.pass).length;
  const pct = Math.round((results.filter(Boolean).length / TEST_CASES.length) * 100);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-pine/85 p-4 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="QA regression bench"
    >
      <div
        className="relative max-h-[88vh] w-full max-w-2xl overflow-hidden border-2 border-mint/40 bg-paper shadow-[10px_10px_0_0_rgba(7,33,30,0.9)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="dark-grid flex items-center justify-between border-b-2 border-pine px-5 py-3.5 text-paper">
          <div>
            <p className="flex items-center gap-2 font-display text-sm font-extrabold uppercase tracking-wide">
              <Icon name="flask" className="h-4 w-4 text-mint" /> QA Bench · regression suite
            </p>
            <p className="mt-0.5 font-mono text-[9px] tracking-[0.24em] text-mint/60">
              {TEST_CASES.length} CASES · LIVE ENGINE · IN-BROWSER
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close QA bench"
            className="grid h-8 w-8 place-items-center border border-mint/40 text-mint transition-all duration-200 hover:bg-mint hover:text-pine"
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>

        {/* progress strip */}
        <div className="border-b border-ink/15 bg-paperdeep/60 px-5 py-2.5">
          <div className="flex items-center justify-between font-mono text-[10px] tracking-widest text-inksoft">
            <span>
              <span className="font-bold text-teal">{passed} PASS</span>
              {failed > 0 && <span className="ml-2 font-bold text-alert">{failed} FAIL</span>}
            </span>
            <span className="tabular-nums">{elapsed.toFixed(1)}s</span>
          </div>
          <div className="mt-1.5 h-1.5 bg-ink/10">
            <div
              className={`h-full transition-all duration-300 ${failed > 0 ? "bg-alert" : "bg-teal"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* case rows */}
        <div className="log-scroll max-h-[52vh] overflow-y-auto px-5 py-3">
          {results.map((r, i) => {
            const t = TEST_CASES[i];
            return (
              <div
                key={t.id}
                className={`flex items-start gap-3 border-b border-dashed border-ink/10 py-2 transition-opacity duration-300 ${
                  r ? "opacity-100" : "opacity-30"
                }`}
              >
                <span className="mt-0.5 w-8 shrink-0 font-mono text-[10px] font-bold text-inksoft">{t.id}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold leading-snug text-ink">{t.name}</span>
                  <span className="block font-mono text-[9px] tracking-wider text-inksoft/70">
                    {t.suite}
                    {r && <span className="ml-2 text-teal/80">{r.detail}</span>}
                  </span>
                </span>
                {r ? (
                  <span
                    className={`mt-0.5 shrink-0 border px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-widest ${
                      r.pass ? "border-teal/50 bg-teal/10 text-teal" : "border-alert/50 bg-alert/10 text-alert"
                    }`}
                  >
                    {r.pass ? "PASS" : "FAIL"}
                  </span>
                ) : (
                  <span className="blink-soft mt-0.5 shrink-0 font-mono text-[9px] font-bold tracking-widest text-inksoft/50">
                    …
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* footer */}
        <div className="flex items-center justify-between gap-3 border-t-2 border-ink bg-paper px-5 py-3">
          <ECGLine className="h-5 w-28 text-teal/60" />
          {phase === "done" && (
            <p
              className={`font-mono text-[11px] font-bold tracking-widest ${
                failed === 0 ? "text-teal" : "text-alert"
              }`}
            >
              {failed === 0 ? "ALL SYSTEMS NOMINAL ✓" : `${failed} CASE(S) NEED ATTENTION`}
            </p>
          )}
          {phase === "running" && (
            <p className="type-caret font-mono text-[11px] tracking-widest text-inksoft">EXECUTING</p>
          )}
        </div>
      </div>
    </div>
  );
}
