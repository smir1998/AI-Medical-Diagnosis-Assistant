import { useEffect, useRef, useState, type ReactNode } from "react";

/* ---------- scroll reveal ---------- */

export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          el.classList.add("in");
          io.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* ---------- scramble-decode title ---------- */

const GLYPHS = "█▓▒░<>/\\|=+*";

export function Scramble({ text, className = "" }: { text: string; className?: string }) {
  const [out, setOut] = useState(text);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setOut(text);
      return;
    }
    let frame = 0;
    const total = 26;
    const id = window.setInterval(() => {
      frame++;
      const settled = Math.floor((frame / total) * text.length);
      setOut(
        text
          .split("")
          .map((ch, i) => {
            if (ch === " ") return " ";
            if (i < settled) return ch;
            return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          })
          .join("")
      );
      if (frame >= total) {
        setOut(text);
        window.clearInterval(id);
      }
    }, 34);
    return () => window.clearInterval(id);
  }, [text]);
  return <span className={className}>{out}</span>;
}

/* ---------- count-up number ---------- */

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
  const [v, setV] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setV(value);
      return;
    }
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        const t0 = performance.now();
        const dur = 1100;
        const tick = (t: number) => {
          const p = Math.min(1, (t - t0) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          setV(value * eased);
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);
  return (
    <span ref={ref} className={className}>
      {v.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/* ---------- ECG trace ---------- */

export function ECGLine({ className = "", slow = false }: { className?: string; slow?: boolean }) {
  return (
    <svg viewBox="0 0 300 40" preserveAspectRatio="none" className={className} aria-hidden="true">
      <polyline
        points="0,22 36,22 44,22 50,8 56,34 62,22 96,22 104,22 110,12 116,30 122,22 158,22 166,22 172,4 178,36 184,22 220,22 228,22 234,14 240,28 246,22 300,22"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        pathLength={100}
        className={`ecg-trace ${slow ? "ecg-slow" : ""}`}
      />
    </svg>
  );
}

/* ---------- section tag ---------- */

export function SectionTag({
  children,
  tone = "teal",
}: {
  children: ReactNode;
  tone?: "teal" | "alert" | "ink";
}) {
  const color = tone === "alert" ? "text-alert" : tone === "ink" ? "text-ink" : "text-teal";
  return (
    <p className={`flex items-center gap-2 font-mono text-[10px] font-bold tracking-[0.28em] uppercase ${color}`}>
      <span aria-hidden="true">✚</span> {children}
    </p>
  );
}

/* ---------- inline SVG icon set ---------- */

export function Icon({ name, className = "h-4 w-4" }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    pulse: <path d="M2 12h4l2.5-7 5 14 2.5-7H22" />,
    cross: <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3z" />,
    flask: <path d="M9 3h6M10 3v5l-6 10a2 2 0 0 0 1.8 3h12.4A2 2 0 0 0 20 18L14 8V3M7.5 14h9" />,
    scan: <path d="M3 7V4a1 1 0 0 1 1-1h3M17 3h3a1 1 0 0 1 1 1v3M21 17v3a1 1 0 0 1-1 1h-3M7 21H4a1 1 0 0 1-1-1v-3M7 12h10" />,
    chat: <path d="M21 12a8 8 0 0 1-8 8H4l2.3-2.9A8 8 0 1 1 21 12zM8.5 12h.01M12 12h.01M15.5 12h.01" />,
    doc: <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8l-5-5zM14 3v5h5M9 13h6M9 17h6M9 9h2" />,
    upload: <path d="M12 16V4m0 0 4 4m-4-4L8 8M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />,
    print: <path d="M6 9V3h12v6M6 17H4a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2M6 14h12v7H6v-7z" />,
    brain: <path d="M9.5 3a3 3 0 0 0-3 3 3.2 3.2 0 0 0-2.4 5A3.2 3.2 0 0 0 6.5 16a3 3 0 0 0 3 3 2.8 2.8 0 0 0 2.5-1.5V4.5A3 3 0 0 0 9.5 3zM14.5 3a3 3 0 0 1 3 3 3.2 3.2 0 0 1 2.4 5 3.2 3.2 0 0 1-2.4 5 3 3 0 0 1-3 3 2.8 2.8 0 0 1-2.5-1.5V4.5A3 2.8 0 0 1 14.5 3z" />,
    stetho: <path d="M5 3v6a5 5 0 0 0 10 0V3M10 14v3a4.5 4.5 0 0 0 9 0v-2.2M19 12.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />,
    warn: <path d="M12 3 2.5 20h19L12 3zM12 9.5v5M12 17.5v.5" />,
    check: <path d="m4.5 12.5 5 5 10-11" />,
    x: <path d="M5 5l14 14M19 5L5 19" />,
    arrow: <path d="M4 12h16m0 0-6-6m6 6-6 6" />,
    clock: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3.5 2" />,
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

export type IconName =
  | "pulse"
  | "cross"
  | "flask"
  | "scan"
  | "chat"
  | "doc"
  | "upload"
  | "print"
  | "brain"
  | "stetho"
  | "warn"
  | "check"
  | "x"
  | "arrow"
  | "clock"
  | "layers"
  | "scope";
