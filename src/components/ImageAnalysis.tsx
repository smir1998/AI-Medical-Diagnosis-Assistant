import { useState } from "react";

interface Props {
  onComplete: (result: any) => void;
}

export function ImageAnalysis({ onComplete }: Props) {
  const [image, setImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const analyze = () => {
    if (!image) return;
    // Simulated CNN analysis
    const pneumonia = Math.random() > 0.5 ? 70 + Math.random() * 25 : 5 + Math.random() * 20;
    onComplete({
      fileName,
      pneumonia: pneumonia.toFixed(1),
      normal: (100 - pneumonia).toFixed(1),
      heat: { x: 50 + Math.random() * 20, y: 50 + Math.random() * 20 },
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => {
            setImage("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Crect width='512' height='512' fill='%23131313'/%3E%3Ccircle cx='256' cy='256' r='180' fill='%23070707'/%3E%3Cellipse cx='320' cy='320' rx='60' ry='50' fill='%23f0f0f0' opacity='0.9'/%3E%3C/svg%3E");
            setFileName("PA_chest_0412.dcm.png");
          }}
          className="inline-flex items-center gap-2 border border-ink/25 bg-paper px-3 py-2 font-mono text-xs font-semibold text-ink transition-all duration-200 hover:border-ink hover:-translate-y-px"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
            <path d="M3 7V4a1 1 0 0 1 1-1h3M17 3h3a1 1 0 0 1 1 1v3M21 17v3a1 1 0 0 1-1 1h-3M7 21H4a1 1 0 0 1-1-1v-3" />
            <path d="M3 12h18" />
          </svg>
          Sample · suspected pneumonia
        </button>
        <label className="inline-flex cursor-pointer items-center gap-2 border border-dashed border-teal/60 px-3 py-2 font-mono text-xs font-semibold text-teal transition-all duration-200 hover:bg-teal/10">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
            <path d="M12 16V4m0 0 4 4m-4-4L8 8M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
          </svg>
          Upload radiograph
          <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
        </label>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <div className="dark-grid relative flex min-h-[280px] items-center justify-center overflow-hidden border-2 border-pine">
          {image ? (
            <div className="relative w-full p-4">
              <img src={image} alt="Chest radiograph" className="mx-auto max-h-[340px] w-auto max-w-full border border-mint/25 object-contain" />
              <p className="mt-2 text-center font-mono text-[10px] tracking-[0.2em] text-mint/60">
                {fileName.toUpperCase()}
              </p>
            </div>
          ) : (
            <p className="px-6 text-center font-mono text-xs leading-relaxed text-mint/50">
              no study loaded
              <span className="block mt-1">choose a sample above or upload a radiograph</span>
            </p>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="dark-grid min-h-[190px] flex-1 border border-pine px-4 py-3 font-mono text-[11px] leading-relaxed text-mint">
            <p className="text-mint/40">// CNN pipeline trace …</p>
          </div>

          <button
            onClick={analyze}
            disabled={!image}
            className="inline-flex items-center justify-center gap-2 bg-teal px-5 py-3 font-display text-sm font-extrabold uppercase tracking-wider text-paper shadow-[5px_5px_0_0_rgba(11,47,45,1)] transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M3 7V4a1 1 0 0 1 1-1h3M17 3h3a1 1 0 0 1 1 1v3M21 17v3a1 1 0 0 1-1 1h-3M7 21H4a1 1 0 0 1-1-1v-3" />
              <path d="M3 12h18" />
            </svg>
            Run CNN inference
          </button>
        </div>
      </div>
    </div>
  );
}
