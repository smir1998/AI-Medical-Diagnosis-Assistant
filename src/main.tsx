import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

/* ------------------------------------------------------------------ */
/*  Boot guard: if anything fails before or during React's first       */
/*  paint, the user sees a readable diagnostic instead of a blank      */
/*  page — "can't open" becomes "here's what broke".                   */
/* ------------------------------------------------------------------ */

const DIAG_STYLE = `
  position:fixed; inset:0; display:grid; place-items:center; background:#0b2f2c;
  font-family:ui-monospace,SFMono-Regular,Menlo,monospace; color:#f5f1e6; padding:24px;
`;
const DIAG_BOX = `
  max-width:560px; width:100%; border:2px solid #c7463c; background:#07211e; padding:28px;
  box-shadow:8px 8px 0 rgba(0,0,0,0.45);
`;

function fatalScreen(title: string, detail: string): void {
  const root = document.getElementById("root");
  if (!root || root.querySelector("[data-fatal]")) return;
  root.innerHTML = `
    <div data-fatal style="${DIAG_STYLE}">
      <div style="${DIAG_BOX}">
        <div style="font-size:11px; letter-spacing:0.3em; color:#8fe3cf; opacity:0.7;">MEDLENS·AI · BOOT DIAGNOSTIC</div>
        <h1 style="font-size:26px; margin:10px 0 14px; font-family:Arial,sans-serif; letter-spacing:-0.5px;">${title}</h1>
        <p style="font-size:12px; line-height:1.6; color:#f5f1e6; opacity:0.85; word-break:break-word;">${detail}</p>
        <p style="font-size:11px; line-height:1.6; color:#8fe3cf; margin-top:14px;">
          Try a hard reload (Ctrl/Cmd + Shift + R). If this is the deployed site,
          the latest build may still be publishing — wait a minute and retry.
        </p>
        <button onclick="location.reload()" style="margin-top:16px; background:#0e7c72; color:#f5f1e6; border:none; padding:10px 18px; font-family:inherit; font-size:12px; letter-spacing:0.2em; cursor:pointer;">RESTART CONSOLE</button>
      </div>
    </div>`;
}

window.addEventListener("error", (e) => {
  if (!document.querySelector("[data-app-mounted]")) {
    fatalScreen("The console failed to start.", `${e.message || "Unknown error"}${e.filename ? ` — ${e.filename}` : ""}`);
  }
});
window.addEventListener("unhandledrejection", (e) => {
  if (!document.querySelector("[data-app-mounted]")) {
    const msg = e.reason instanceof Error ? e.reason.message : String(e.reason);
    fatalScreen("A boot task was rejected.", msg);
  }
});

try {
  ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
} catch (err) {
  fatalScreen("React could not mount.", err instanceof Error ? err.message : String(err));
}
