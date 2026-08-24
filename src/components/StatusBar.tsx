import { useEffect, useState } from "react";
import { ECGLine, Icon } from "./ui";

function StatusChip({ label, value, ok = true }: { label: string; value: string; ok?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 border border-paper/15 bg-paper/5 px-2 py-1 font-mono text-[10px] tracking-widest text-paper/80">
      <span className={`h-1.5 w-1.5 rounded-full dot-live ${ok ? "bg-mint" : "bg-alert"}`} />
      <span className="text-paper/50">{label}</span>
      <span className="font-semibold text-paper">{value}</span>
    </span>
  );
}

export function StatusBar() {
  const [time, setTime] = useState("--:--:--");
  const [date, setDate] = useState("");

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setTime(d.toLocaleTimeString("en-GB"));
      setDate(
        d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })
      );
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-pine text-paper shadow-lg shadow-pine/30">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5 sm:px-6">
        {/* brand */}
        <a href="#top" className="group flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center bg-teal text-paper transition-transform duration-300 group-hover:-rotate-6">
            <Icon name="pulse" className="h-5 w-5" />
          </span>
          <span className="leading-none">
            <span className="block font-display text-lg font-black tracking-tight">
              MedLens<span className="text-mint">·AI</span>
            </span>
            <span className="block font-mono text-[9px] tracking-[0.28em] text-paper/50">
              TRIAGE CONSOLE v3.2
            </span>
          </span>
        </a>

        {/* model status */}
        <div className="hidden flex-wrap items-center gap-2 md:flex">
          <StatusChip label="CNN" value="ONLINE" />
          <StatusChip label="NLP" value="READY" />
          <StatusChip label="GPU" value="RTX·SIM" />
        </div>

        <div className="ml-auto flex items-center gap-4">
          <span className="hidden text-right font-mono text-[10px] leading-tight text-paper/60 sm:block">
            {date}
            <span className="block text-[9px] tracking-[0.2em] text-paper/35">STATION 08 · ED TRIAGE</span>
          </span>
          <span className="border border-mint/30 bg-mint/10 px-2.5 py-1 font-mono text-sm font-semibold tabular-nums tracking-widest text-mint">
            {time}
          </span>
        </div>
      </div>
      <ECGLine className="block h-7 w-full text-mint" />
      <div className="h-px bg-mint/20" />
    </header>
  );
}
