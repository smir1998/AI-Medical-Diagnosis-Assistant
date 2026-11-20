import { HF_MODEL_ZOO } from "../data/medical";

export function ModelRegistry() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="mb-8">
        <p className="font-mono text-xs font-bold tracking-widest text-teal">MODEL REGISTRY</p>
        <h2 className="mt-2 font-display text-4xl font-black tracking-tight sm:text-5xl">
          External model references<span className="text-teal">.</span>
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-inksoft">
          These Hugging Face pages are references for further study. This demo does not download or run
          these models, and their published metrics do not describe this app's outputs.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {HF_MODEL_ZOO.map((m) => (
          <a
            key={m.repoId}
            href={`https://huggingface.co/${m.repoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col border-2 border-ink bg-paper p-4 transition-all duration-300 hover:-translate-y-1 hover:border-teal hover:shadow-[7px_7px_0_0_rgba(14,124,114,0.85)]"
          >
            <div className="flex items-center justify-between">
              <span
                className={`border px-1.5 py-0.5 font-mono text-[8px] font-bold tracking-widest uppercase ${
                  m.tag === "vision"
                    ? "border-teal/40 bg-teal/15 text-teal"
                    : m.tag === "nlp"
                      ? "border-amber/40 bg-amber/15 text-amber"
                      : m.tag === "llm"
                        ? "border-alert/40 bg-alert/15 text-alert"
                        : "border-ink/30 bg-ink/10 text-ink"
                }`}
              >
                {m.tag}
              </span>
              <span className="font-mono text-[9px] tracking-widest text-inksoft">{m.params}</span>
            </div>

            <p className="mt-3 break-all font-mono text-[11px] font-semibold leading-snug text-teal underline-offset-2 group-hover:underline">
              {m.repoId}
              <span className="ml-1 inline-block transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">↗</span>
            </p>

            <p className="mt-2 font-display text-[15px] font-extrabold leading-tight">{m.name}</p>

            <dl className="mt-3 space-y-1.5 border-t border-dashed border-ink/20 pt-3 font-mono text-[10px] leading-relaxed">
              <div className="flex justify-between gap-2">
                <dt className="shrink-0 text-inksoft/70">ARCH</dt>
                <dd className="text-right text-ink">{m.arch}</dd>
              </div>
              <div>
                <dt className="text-inksoft/70">TRAINED ON</dt>
                <dd className="text-ink">{m.dataset}</dd>
              </div>
              <div>
                <dt className="text-inksoft/70">HEADLINE</dt>
                <dd className="font-semibold text-teal">{m.metric}</dd>
              </div>
              <div className="flex justify-between gap-2">
                  <dt className="shrink-0 text-inksoft/70">PUBLISHED ACC</dt>
                <dd className="tabular-nums font-bold text-ink">{m.acc.toFixed(2)}%</dd>
              </div>
            </dl>

            <p className="mt-3 border-t border-dashed border-ink/20 pt-2 text-center font-mono text-[9px] tracking-widest text-inksoft">
              REFERENCE → {m.role.toUpperCase()}
            </p>
          </a>
        ))}
      </div>

      <div className="mt-8 border-l-2 border-amber pl-4">
        <p className="font-mono text-xs leading-relaxed text-inksoft">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1 inline h-4 w-4 text-amber">
            <path d="M12 3L1.5 20h21L12 3zM12 9.5v5M12 17.5v.5" />
          </svg>
          <strong className="text-amber">Model note:</strong> Model cards and their metrics belong to the linked projects. They are not evidence of this demo's accuracy or clinical performance.
        </p>
      </div>
    </section>
  );
}
