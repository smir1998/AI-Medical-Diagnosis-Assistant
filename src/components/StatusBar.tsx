import { useEffect, useState } from "react";

export function StatusBar() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString("en-GB"));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-pine text-paper shadow-lg">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center bg-teal text-paper">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
                <path d="M2 12h4l3-8 4 16 3-8h6" />
              </svg>
            </div>
            <div>
              <h1 className="font-display text-xl font-black">MedLens·AI</h1>
              <p className="font-mono text-[9px] tracking-widest text-paper/60">DEEP LEARNING IN HEALTH CARE</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 md:flex">
              <span className="inline-flex items-center gap-1.5 border border-paper/15 bg-paper/5 px-2 py-1 font-mono text-[10px] tracking-widest text-paper/80">
                <span className="h-1.5 w-1.5 rounded-full bg-mint dot-live" />
                <span className="text-paper/50">CNN</span>
                <span className="font-semibold text-paper">ONLINE</span>
              </span>
              <span className="inline-flex items-center gap-1.5 border border-paper/15 bg-paper/5 px-2 py-1 font-mono text-[10px] tracking-widest text-paper/80">
                <span className="h-1.5 w-1.5 rounded-full bg-mint dot-live" />
                <span className="text-paper/50">NLP</span>
                <span className="font-semibold text-paper">READY</span>
              </span>
            </div>
            <span className="border border-mint/30 bg-mint/10 px-2.5 py-1 font-mono text-sm font-semibold tabular-nums tracking-widest text-mint">
              {time}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
