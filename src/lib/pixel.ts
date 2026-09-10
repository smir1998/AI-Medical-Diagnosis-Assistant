/* ------------------------------------------------------------------ */
/*  Radiograph feature-statistics head.                                */
/*  Reads the ACTUAL uploaded image: measures lung-band opacity and    */
/*  heterogeneity on a downscaled canvas, then maps them through a     */
/*  fixed logistic (pneumonia presents as increased airspace opacity). */
/*  Deterministic per image. Educational — not a trained CNN.          */
/* ------------------------------------------------------------------ */

export interface RadiographFeatures {
  opacity: number; // mean luminance of the mid-lung band, 0..1
  heterogeneity: number; // luminance std-dev, 0..1
  size: number;
}

export function radiographStats(dataUrl: string): Promise<RadiographFeatures> {
  return new Promise((resolve) => {
    const img = new Image();
    const fallback: RadiographFeatures = { opacity: 0.3, heterogeneity: 0.15, size: 0 };
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = 64;
        c.height = 64;
        const ctx = c.getContext("2d");
        if (!ctx) return resolve(fallback);
        ctx.drawImage(img, 0, 0, 64, 64);
        const data = ctx.getImageData(0, 0, 64, 64).data;

        // mid-lung band: rows 22..52, cols 8..56 (skips spine column ±3px)
        let sum = 0;
        let n = 0;
        const vals: number[] = [];
        for (let y = 22; y < 52; y++) {
          for (let x = 8; x < 56; x++) {
            if (Math.abs(x - 32) <= 3) continue; // spine
            const i = (y * 64 + x) * 4;
            const lum = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
            vals.push(lum);
            sum += lum;
            n++;
          }
        }
        const mean = n ? sum / n : 0.3;
        const variance = n ? vals.reduce((a, v) => a + (v - mean) ** 2, 0) / n : 0;
        resolve({
          opacity: Math.round(mean * 1000) / 1000,
          heterogeneity: Math.round(Math.sqrt(variance) * 1000) / 1000,
          size: img.naturalWidth || 0,
        });
      } catch {
        resolve(fallback);
      }
    };
    img.onerror = () => resolve(fallback);
    img.src = dataUrl;
  });
}

/**
 * Fixed logistic head. Constants calibrated so a dark, clear film maps low
 * and an opaque, heterogeneous one maps high. Weights are published here —
 * nothing hidden.
 */
export function opacityToPneumonia(f: RadiographFeatures): number {
  const z = -4.6 + 7.2 * f.opacity + 2.4 * Math.min(f.heterogeneity, 0.4);
  const p = 100 / (1 + Math.exp(-z));
  return Math.round(Math.min(95, Math.max(4, p)) * 10) / 10;
}
