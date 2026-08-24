import { useEffect, useState } from "react";
import { runSuite } from "../lib/tests";
import type { CaseResult } from "../lib/tests";
import { Icon } from "./ui";

interface Props {
  onClose: () => void;
}

export function QABench({ onClose }: Props) {
  const [results, setResults] = useState<CaseResult[]>([]);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState<number | null>(null);

  const start = async () => {
    if (running) return;
    setRunning(true);
    setResults([]);
    setElapsed(null);
    const t0 = performance.now();
    await runSuite((r) => setResults((prev) => [...prev, r]));
    setElapsed(performance.now() - t0);
    setRunning(false);
  };

  useEffect(() => {
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const passed = results.filter((r) => r.pass).length;
  const done = results.length;
  const total = 20;
  const allDone = !running && done > 0;
  const allPass = allDone && passed === done;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-pine/80 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="QA bench"
    >
      <div
        className="flex max-h-[88vh] w-full max-w-3xl flex-col border-2 border-ink bg-paper shadow-[10px_10px_0_0_rgba(11,47,45,0.95)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between gap-4 border-b-2 border-ink bg-pine px-5 py-3.5 text-paper">
          <p className="flex items-center gap-2.5 font-display text-sm font-extrabold uppercase tracking-wide">
            <span className="grid h-7 w-7 place-items-center bg-mint text-pine">
              <Icon name="check" className="h-4 w-4" />
            </span>
            QA Bench <span className="font-mono text-[10px] font-normal tracking-[0.24em] text-mint/70">REGRESSION SUITE · IN-BROWSER</span>
          </p>
          <button
            onClick={onClose}
            aria-label="Close QA bench"
            className="grid h-8 w-8 place-items-center border border-paper/30 text-paper/70 transition-all hover:border-alert hover:bg-alert hover:text-paper"
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>

        {/* summary strip */}
        <div className="grid grid-cols-4 divide-x divide-ink/10 border-b border-ink/15 bg-paperdeep/60 font-mono text-[11px]">
          <div className="px-4 py-2.5">
            <p className="text-[9px] tracking-[0.2em] text-inksoft/70">PASSED</p>
            <p className="font-bold tabular-nums text-teal">{passed}</p>
          </div>
          <div className="px-4 py-2.5">
            <p className="text-[9px] tracking-[0.2em] text-inksoft/70">FAILED</p>
            <p className={`font-bold tabular-nums ${done - passed > 0 ? "text-alert" : "text-ink"}`}>{done - passed}</p>
          </div>
          <div className="px-4 py-2.5">
            <p className="text-[9px] tracking-[0.2em] text-inksoft/70">RUN</p>
            <p className="font-bold tabular-nums text-ink">
              {done}/{total}
            </p>
          </div>
          <div className="px-4 py-2.5">
            <p className="text-[9px] tracking-[0.2em] text-inksoft/70">ELAPSED</p>
            <p className="font-bold tabular-nums text-ink">{elapsed ? `${(elapsed / 1000).toFixed(2)}s` : running ? "…" : "—"}</p>
          </div>
        </div>

        {/* progress */}
        <div className="h-1.5 bg-ink/10">
          <div
            className={`bar-fill h-full ${allPass ? "bg-teal" : allDone ? "bg-alert" : "bg-amber"}`}
            style={{ width: `${(done / total) * 100}%` }}
          />
        </div>

        {/* case list */}
        <div className="log-scroll flex-1 space-y-1.5 overflow-y-auto p-4">
          {results.length === 0 && running && (
            <p className="py-6 text-center font-mono text-xs text-inksoft/60">
              <span className="blink-soft">▮</span> executing battery against live engine …
            </p>
          )}
          {results.map((r) => (
            <div
              key={r.id}
              className={`flex items-start gap-3 border px-3 py-2 transition-colors ${
                r.pass ? "border-ink/12 bg-paper" : "border-alert/50 bg-alert/8"
              }`}
            >
              <span
                className={`mt-0.5 grid h-6 w-10 shrink-0 place-items-center font-mono text-[10px] font-bold tracking-widest ${
                  r.pass ? "bg-teal text-paper" : "bg-alert text-paper"
                }`}
              >
                {r.pass ? "PASS" : "FAIL"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-semibold leading-snug text-ink">
                  <span className="mr-1.5 font-mono text-[10px] font-bold text-inksoft/60">{r.id}</span>
                  {r.name}
                </p>
                <p className="mt-0.5 truncate font-mono text-[10.5px] tracking-wide text-inksoft/80">
                  <span className="mr-2 border border-ink/15 px-1 py-px text-[8.5px] tracking-[0.18em]">{r.suite}</span>
                  {r.detail}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* footer */}
        <div className="flex items-center justify-between gap-3 border-t-2 border-ink bg-paperdeep/70 px-5 py-3">
          <p className="font-mono text-[10px] tracking-wider text-inksoft/80">
            {running ? (
              <span className="blink-soft text-amber">RUNNING …</span>
            ) : allPass ? (
              <span className="font-bold text-teal">✓ ALL SYSTEMS NOMINAL — {passed}/{total} green</span>
            ) : (
              <span className="font-bold text-alert">✗ {done - passed} CASE(S) NEED ATTENTION</span>
            )}
          </p>
          <button
            onClick={start}
            disabled={running}
            className="inline-flex items-center gap-2 border border-ink px-3.5 py-2 font-mono text-[11px] font-bold uppercase tracking-wider transition-all duration-200 hover:bg-ink hover:text-paper disabled:opacity-40"
          >
            <Icon name="pulse" className="h-3.5 w-3.5" /> Re-run suite
          </button>
        </div>
      </div>
    </div>
  );
}
