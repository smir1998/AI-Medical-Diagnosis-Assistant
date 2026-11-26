import type { CxrModelResult } from "./cxrModel";

export interface PixelStats {
  meanLuminance: number;
  luminanceStdDev: number;
  minLuminance: number;
  maxLuminance: number;
  sampledPixels: number;
}

export interface ImageResult extends PixelStats {
  source: "sample" | "upload";
  fileName: string;
  width: number;
  height: number;
  runId: string;
  model?: CxrModelResult;
}

/** Calculate descriptive grayscale statistics from RGBA pixel data. */
export function calculatePixelStats(data: ArrayLike<number>, width: number, height: number): PixelStats {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new Error("Image dimensions must be positive integers.");
  }
  if (data.length !== width * height * 4) {
    throw new Error("Pixel buffer length does not match its image dimensions.");
  }

  let sum = 0;
  let minLuminance = 255;
  let maxLuminance = 0;
  const luminances = new Array<number>(width * height);

  for (let pixel = 0; pixel < width * height; pixel++) {
    const index = pixel * 4;
    const alpha = data[index + 3] / 255;
    // Composite transparent pixels over black so transparent padding is measured consistently.
    const red = data[index] * alpha;
    const green = data[index + 1] * alpha;
    const blue = data[index + 2] * alpha;
    const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    luminances[pixel] = luminance;
    sum += luminance;
    minLuminance = Math.min(minLuminance, luminance);
    maxLuminance = Math.max(maxLuminance, luminance);
  }

  const mean = sum / luminances.length;
  const variance = luminances.reduce((total, value) => total + (value - mean) ** 2, 0) / luminances.length;
  const round = (value: number) => Math.round(value * 10) / 10;
  return {
    meanLuminance: round(mean),
    luminanceStdDev: round(Math.sqrt(variance)),
    minLuminance: round(minLuminance),
    maxLuminance: round(maxLuminance),
    sampledPixels: luminances.length,
  };
}

/** Read an image in the browser and calculate pixel statistics without classification. */
export function inspectImagePixels(
  source: ImageResult["source"],
  fileName: string,
  dataUrl: string,
): Promise<ImageResult> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const width = image.naturalWidth;
        const height = image.naturalHeight;
        if (!width || !height) throw new Error("The image has no readable pixel dimensions.");

        // Preserve aspect ratio while bounding browser work to at most 128×128 pixels.
        const scale = Math.min(1, 128 / Math.max(width, height));
        const sampleWidth = Math.max(1, Math.round(width * scale));
        const sampleHeight = Math.max(1, Math.round(height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = sampleWidth;
        canvas.height = sampleHeight;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error("This browser could not create a pixel-reading canvas.");
        context.fillStyle = "#000";
        context.fillRect(0, 0, sampleWidth, sampleHeight);
        context.drawImage(image, 0, 0, sampleWidth, sampleHeight);
        const pixels = context.getImageData(0, 0, sampleWidth, sampleHeight).data;
        const stats = calculatePixelStats(pixels, sampleWidth, sampleHeight);
        resolve({
          ...stats,
          source,
          fileName,
          width,
          height,
          runId: `PX-${Date.now().toString(36).toUpperCase()}`,
        });
      } catch (error) {
        reject(error instanceof Error ? error : new Error("Could not inspect image pixels."));
      }
    };
    image.onerror = () => reject(new Error("The selected image could not be decoded."));
    image.src = dataUrl;
  });
}

