import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "../lib/engine";
import { runSuite, TEST_CASES } from "../lib/tests";
import type { CaseResult } from "../lib/tests";
import { Icon } from "./ui";

interface Props {
  onClose: () => void;
}

const SUIT_ORDER = ["SYMPTOM NLP", "RADIOLOGY CNN", "NLP DESK", "DERM SCREEN"] as const;

export function QABench({ onClose }: Props) {
  const [results, setResults] = useState<(CaseResult | null)[]>(() => TEST_CASES.map(() => null));
  const [phase, setPhase] = useState<"running" | "done">("running");
  const [elapsed, setElapsed] = useState(0);
  const gen = useRef(0);

  const run = async () => {
    const myGen = ++gen.current;
    setPhase("running");
    setElapsed(0);
    setResults(TEST_CASES.map(() => null));
    const t0 = performance.now();
    const reduced = prefersReducedMotion();
    await runSuite((r, idx) => {
      if (gen.current !== myGen) return;
      setResults((prev) => {
        const next = [...prev];
        next[idx] = r;
        return next;
      });
    });
    if (gen.current !== myGen) return;
    // let the last row breathe before flipping to done
    if (!reduced) await new Promise((r) => setTimeout(r, 260));
    if (gen.current !== myGen) return;
    setElapsed(Math.max(1, Math.round(performance.now() - t0)));
    setPhase("done");
  };

  useEffect(() => {
    void run();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      gen.current++;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const done = results.filter((r): r is CaseResult => r !== null);
  const passed = done.filter((r) => r.pass).length;
  const failed = done.filter((r) => !r.pass).length;
  const progress = done.length / TEST_CASES.length;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-pine/85 p-4 backdrop-blur-[3px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="QA bench — regression test results"
    >
      <div
        className="flex max-h-[86vh] w-full max-w-2xl flex-col border-2 border-mint/40 bg-ink text-paper shadow-[12px_12px_0_0_rgba(4,20,20,0.8)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between gap-4 border-b border-mint/25 bg-pine px-5 py-3.5">
          <div>
            <p className="flex items-center gap-2 font-display text-base font-black tracking-tight">
              <Icon name="check" className="h-4 w-4 text-mint" />
              QA BENCH <span className="font-mono text-[10px] font-normal tracking-[0.24em] text-paper/50">REGRESSION SUITE v1.0</span>
            </p>
            <p className="mt-0.5 font-mono text-[10px] tracking-wider text-paper/55">
              {TEST_CASES.length} cases · engine exercised in-browser · zero mocks
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close QA bench"
            className="grid h-8 w-8 shrink-0 place-items-center border border-paper/25 text-paper/70 transition-all duration-200 hover:rotate-90 hover:border-alert hover:text-alert"
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>

        {/* progress + summary strip */}
        <div className="border-b border-mint/20 px-5 py-3">
          <div className="flex items-center gap-4 font-mono text-[11px]">
            <span className="tabular-nums text-paper/70">
              {done.length}/{TEST_CASES.length}
            </span>
            <div className="h-1.5 flex-1 bg-paper/10">
              <div
                className={`h-full transition-all duration-300 ${failed > 0 ? "bg-alert" : "bg-mint"}`}
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            {phase === "done" && (
              <span className="tabular-nums text-paper/60">{elapsed} ms</span>
            )}
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span className="border border-mint/40 bg-mint/10 px-2 py-0.5 font-mono text-[11px] font-bold tabular-nums text-mint">
              {passed} PASS
            </span>
            <span
              className={`border px-2 py-0.5 font-mono text-[11px] font-bold tabular-nums ${
                failed > 0 ? "border-alert/60 bg-alert/15 text-alert" : "border-paper/20 text-paper/40"
              }`}
            >
              {failed} FAIL
            </span>
            {phase === "done" && (
              <span
                className={`ml-auto px-2 py-0.5 font-display text-[11px] font-black uppercase tracking-widest ${
                  failed === 0 ? "bg-mint text-pine" : "bg-alert text-paper"
                }`}
              >
                {failed === 0 ? "All systems nominal" : "Failures detected"}
              </span>
            )}
            {phase === "running" && (
              <span className="blink-soft ml-auto font-mono text-[10px] tracking-[0.24em] text-mint">
                RUNNING…
              </span>
            )}
          </div>
        </div>

        {/* results list */}
        <div className="log-scroll min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {SUIT_ORDER.map((suit) => (
            <div key={suit} className="mb-4 last:mb-0">
              <p className="mb-1.5 font-mono text-[9px] font-bold tracking-[0.26em] text-mint/60">
                ── {suit}
              </p>
              <ul className="space-y-1">
                {TEST_CASES.map((t, idx) => {
                  if (t.suite !== suit) return null;
                  const r = results[idx];
                  return (
                    <li
                      key={t.id}
                      className={`flex items-start gap-2.5 border px-3 py-2 transition-all duration-300 ${
                        r
                          ? r.pass
                            ? "border-mint/25 bg-mint/5"
                            : "border-alert/50 bg-alert/10"
                          : "border-paper/10 bg-paper/[0.03] opacity-60"
                      }`}
                    >
                      <span
                        className={`mt-0.5 grid h-4.5 w-4.5 shrink-0 place-items-center font-mono text-[10px] font-bold ${
                          !r ? "text-paper/30" : r.pass ? "bg-mint text-pine" : "bg-alert text-paper"
                        }`}
                        style={{ width: 18, height: 18 }}
                      >
                        {!r ? "·" : r.pass ? "✓" : "✕"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12.5px] font-semibold leading-snug">
                          <span className="mr-1.5 font-mono text-[10px] text-paper/40">{t.id}</span>
                          {t.name}
                        </span>
                        {r && (
                          <span
                            className={`mt-0.5 block font-mono text-[10.5px] tracking-wide ${
                              r.pass ? "text-mint/80" : "text-alert"
                            }`}
                          >
                            {r.pass ? "▸ " : "✗ "}
                            {r.detail}
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* footer */}
        <div className="flex items-center justify-between gap-3 border-t border-mint/25 bg-pine px-5 py-3">
          <p className="font-mono text-[10px] leading-relaxed text-paper/55">
            Cases hit the live engine functions —
            <span className="block">the same code the labs run.</span>
          </p>
          <button
            onClick={() => void run()}
            disabled={phase === "running"}
            className="inline-flex items-center gap-2 border border-mint/50 bg-mint/10 px-4 py-2 font-display text-xs font-extrabold uppercase tracking-wider text-mint transition-all duration-200 hover:-translate-y-px hover:bg-mint hover:text-pine disabled:cursor-wait disabled:opacity-50"
          >
            <Icon name="pulse" className={`h-3.5 w-3.5 ${phase === "running" ? "spin-slow" : ""}`} />
            Re-run suite
          </button>
        </div>
      </div>
    </div>
  );
}
