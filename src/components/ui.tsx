import { useEffect, useRef, useState, type ReactNode } from "react";

/* ---------- prefers-reduced-motion ---------- */

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fn = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return reduced;
}

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
  const [inView, setInView] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) {
      setInView(true);
      return;
    }
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
  }, [reduced]);

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

/* ---------- scramble-decode title ---------- */

const GLYPHS = "▓▒░#%+X01△▽";

export function Scramble({ text, className = "" }: { text: string; className?: string }) {
  const reduced = usePrefersReducedMotion();
  const [out, setOut] = useState(reduced ? text : "");

  useEffect(() => {
    if (reduced) {
      setOut(text);
      return;
    }
    let frame = 0;
    const total = Math.max(14, text.length * 3);
    const id = window.setInterval(() => {
      frame++;
      const reveal = Math.floor((frame / total) * text.length);
      let s = "";
      for (let i = 0; i < text.length; i++) {
        s += i < reveal ? text[i] : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      setOut(s);
      if (frame >= total) {
        setOut(text);
        window.clearInterval(id);
      }
    }, 40);
    return () => window.clearInterval(id);
  }, [text, reduced]);

  return <span className={className}>{out || "\u00A0"}</span>;
}

/* ---------- count-up ---------- */

export function CountUp({
  value,
  decimals = 0,
  suffix = "",
  duration = 1200,
  className = "",
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(reduced ? value : 0);
  const started = useRef(false);

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started.current) return;
        started.current = true;
        const t0 = performance.now();
        const tick = (t: number) => {
          const p = Math.min(1, (t - t0) / duration);
          const eased = 1 - Math.pow(1 - p, 3);
          setDisplay(value * eased);
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        io.disconnect();
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value, duration, reduced]);

  return (
    <span ref={ref} className={className}>
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/* ---------- ECG trace ---------- */

const ECG_PATH =
  "M0 22 L12 22 L16 22 L20 12 L24 30 L28 22 L40 22 L44 20 L48 24 L52 22 L70 22 L74 22 L78 6 L82 34 L86 22 L100 22";

export function ECGLine({ className = "", slow = false }: { className?: string; slow?: boolean }) {
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className={className} aria-hidden="true">
      <path
        d={ECG_PATH}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        pathLength={100}
        className={`ecg-trace ${slow ? "ecg-slow" : ""}`}
        opacity="0.9"
      />
      <path
        d={ECG_PATH}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        vectorEffect="non-scaling-stroke"
        opacity="0.18"
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
    <span
      className={`inline-flex items-center gap-2 border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.24em] ${tones[tone]}`}
    >
      <span className="h-1.5 w-1.5 bg-current" />
      {children}
    </span>
  );
}

/* ---------- custom SVG icons ---------- */

export type IconName =
  | "pulse"
  | "scan"
  | "stetho"
  | "chat"
  | "brain"
  | "report"
  | "check"
  | "x"
  | "warn"
  | "arrow"
  | "upload"
  | "flask"
  | "clock"
  | "layers"
  | "scope"
  | "user"
  | "print"
  | "doc";

export function Icon({ name, className = "h-4 w-4" }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    pulse: <path d="M2 12h4l3-8 4 16 3-8h6" />,
    scan: (
      <>
        <path d="M3 7V4a1 1 0 0 1 1-1h3M17 3h3a1 1 0 0 1 1 1v3M21 17v3a1 1 0 0 1-1 1h-3M7 21H4a1 1 0 0 1-1-1v-3" />
        <path d="M3 12h18" />
      </>
    ),
    stetho: (
      <>
        <path d="M5 3v5a5 5 0 0 0 10 0V3" />
        <path d="M10 13v3a4 4 0 0 0 8 0v-2" />
        <circle cx="18" cy="11" r="2" />
      </>
    ),
    chat: <path d="M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5zM8 10h8M8 13h5" />,
    brain: (
      <>
        <path d="M9.5 2a3 3 0 0 0-3 3 3.5 3.5 0 0 0-2 6A3.5 3.5 0 0 0 6 17a3 3 0 0 0 6 0V5a3 3 0 0 0-2.5-3z" />
        <path d="M14.5 2a3 3 0 0 1 3 3 3.5 3.5 0 0 1 2 6A3.5 3.5 0 0 1 18 17a3 3 0 0 1-6 0V5a3 3 0 0 1 2.5-3z" />
      </>
    ),
    report: (
      <>
        <path d="M6 2h9l4 4v16H6z" />
        <path d="M15 2v4h4M9 12h7M9 16h7" />
      </>
    ),
    check: <path d="M4 12.5l5 5L20 6.5" />,
    x: <path d="M5 5l14 14M19 5L5 19" />,
    warn: <path d="M12 3L1.5 21h21L12 3zM12 10v5M12 18.2v.3" />,
    arrow: <path d="M4 12h15M13 6l6 6-6 6" />,
    upload: <path d="M12 16V4M6 10l6-6 6 6M4 20h16" />,
    flask: <path d="M9 3h6M10 3v6L4.5 19a1.5 1.5 0 0 0 1.4 2h12.2a1.5 1.5 0 0 0 1.4-2L14 9V3M7.5 15h9" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3.5 2" />
      </>
    ),
    layers: <path d="m12 3 9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5" />,
    scope: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m20.5 20.5-5.4-5.4M8 10.5h5M10.5 8v5" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
      </>
    ),
    print: (
      <>
        <path d="M7 8V3h10v5" />
        <path d="M5 8h14a1 1 0 0 1 1 1v7h-4v5H8v-5H4V9a1 1 0 0 1 1-1z" />
        <path d="M8 17h8" />
      </>
    ),
    doc: (
      <>
        <path d="M6 2h9l4 4v16H6z" />
        <path d="M15 2v4h4M9 11h7M9 14.5h7M9 18h4" />
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
