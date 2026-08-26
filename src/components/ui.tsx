import { useEffect, useRef, useState, type ReactNode } from "react";

/* ---------- scroll reveal ---------- */

export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${inView ? "in" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ---------- scramble-decode headline ---------- */

const GLYPHS = "▓▒░<>/\\+=*#%@";

export function Scramble({ text, className = "" }: { text: string; className?: string }) {
  const [out, setOut] = useState(text);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const total = 26;
    const id = window.setInterval(() => {
      frame++;
      const locked = Math.floor((frame / total) * text.length);
      let next = "";
      for (let i = 0; i < text.length; i++) {
        next += i < locked ? text[i] : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      setOut(next);
      if (frame >= total) {
        setOut(text);
        window.clearInterval(id);
      }
    }, 42);
    return () => window.clearInterval(id);
  }, [text]);

  return <span className={className}>{out}</span>;
}

/* ---------- animated count-up ---------- */

export function CountUp({
  value,
  decimals = 0,
  suffix = "",
  className = "",
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const t0 = performance.now();
        const dur = 1100;
        const tick = (t: number) => {
          const p = Math.min(1, (t - t0) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          setDisplay(value * eased);
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);

  return (
    <span ref={ref} className={className}>
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/* ---------- ECG trace ---------- */

export function ECGLine({ className = "", slow = false }: { className?: string; slow?: boolean }) {
  return (
    <svg
      viewBox="0 0 600 60"
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M0 30 H80 L92 30 L100 12 L108 46 L116 30 H190 L202 30 L210 12 L218 46 L226 30 H300 L312 30 L320 12 L328 46 L336 30 H410 L422 30 L430 12 L438 46 L446 30 H520 L532 30 L540 12 L548 46 L556 30 H600"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        pathLength={100}
        className={`ecg-trace ${slow ? "ecg-slow" : ""}`}
      />
    </svg>
  );
}

/* ---------- section tag ---------- */

export function SectionTag({ children, tone = "teal" }: { children: ReactNode; tone?: "teal" | "alert" | "ink" }) {
  const tones = {
    teal: "text-teal border-teal/40",
    alert: "text-alert border-alert/40",
    ink: "text-ink border-ink/30",
  };
  return (
    <p className={`inline-flex items-center gap-2 border px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.28em] uppercase ${tones[tone]}`}>
      <span className="blink-soft">▮</span> {children}
    </p>
  );
}

/* ---------- inline SVG icon set ---------- */

export type IconName =
  | "pulse"
  | "brain"
  | "scan"
  | "stetho"
  | "chat"
  | "upload"
  | "doc"
  | "print"
  | "check"
  | "warn"
  | "x"
  | "arrow"
  | "flask"
  | "clock"
  | "layers"
  | "scope";

export function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    pulse: <path d="M2 12h4l3-8 4 16 3-8h6" />,
    brain: (
      <path d="M9.5 3a3 3 0 0 0-3 3 3.2 3.2 0 0 0-2.3 3.1c0 .9.4 1.7 1 2.3A3.3 3.3 0 0 0 6.5 17a3 3 0 0 0 3 3.5c.8 0 1.6-.3 2.2-.8h.6c.6.5 1.4.8 2.2.8a3 3 0 0 0 3-3.5 3.3 3.3 0 0 0 1.3-5.6c.6-.6 1-1.4 1-2.3A3.2 3.2 0 0 0 17.5 6a3 3 0 0 0-3-3c-.8 0-1.6.3-2.2.8h-.6C11.1 3.3 10.3 3 9.5 3ZM12 4.5v15" />
    ),
    scan: (
      <>
        <path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" />
        <path d="M4 12h16" />
      </>
    ),
    stetho: (
      <path d="M5 3v6a5 5 0 0 0 10 0V3M10 14v3a4 4 0 0 0 8 0v-1.3M18 13.5a2 2 0 1 0 0 .01" />
    ),
    chat: <path d="M21 12a8 8 0 0 1-8 8H4l2.3-3A8 8 0 1 1 21 12ZM8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01" />,
    upload: <path d="M12 16V4m0 0 4 4m-4-4L8 8M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />,
    doc: (
      <>
        <path d="M6 2.5h8l4 4V21.5H6z" />
        <path d="M14 2.5v4h4M9 12h6M9 15.5h6M9 8.5h2" />
      </>
    ),
    print: (
      <>
        <path d="M6 9V3h12v6M6 17H3v-7h18v7h-3" />
        <path d="M6 14h12v7H6z" />
      </>
    ),
    check: <path d="m4.5 12.5 5 5L19.5 6.5" />,
    warn: (
      <>
        <path d="M12 3 2.5 20h19L12 3Z" />
        <path d="M12 9.5V14M12 16.8v.4" />
      </>
    ),
    x: <path d="M5 5l14 14M19 5 5 19" />,
    arrow: <path d="M4 12h15m0 0-6-6m6 6-6 6" />,
    flask: <path d="M9.5 3h5M10 3v6.2L4.8 18a2 2 0 0 0 1.8 3h10.8a2 2 0 0 0 1.8-3L14 9.2V3M7.5 14.5h9" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3.5 2" />
      </>
    ),
    layers: <path d="m12 3 9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5" />,
    scope: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m20.5 20.5-5.4-5.4M8 10.5h5M10.5 8v5" />
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
