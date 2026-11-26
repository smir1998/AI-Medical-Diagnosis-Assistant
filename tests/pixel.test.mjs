import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { calculatePixelStats, inspectImagePixels } from "../src/lib/pixel.ts";

describe("image pixel statistics", () => {
  test("computes luminance summary from actual RGBA pixels", () => {
    const rgba = new Uint8ClampedArray([
      0, 0, 0, 255,
      255, 255, 255, 255,
    ]);
    assert.deepEqual(calculatePixelStats(rgba, 2, 1), {
      meanLuminance: 127.5,
      luminanceStdDev: 127.5,
      minLuminance: 0,
      maxLuminance: 255,
      sampledPixels: 2,
    });
  });

  test("weights color channels using standard relative luminance", () => {
    const redPixel = new Uint8ClampedArray([255, 0, 0, 255]);
    const stats = calculatePixelStats(redPixel, 1, 1);
    assert.equal(stats.meanLuminance, 54.2);
    assert.equal(stats.luminanceStdDev, 0);
  });

  test("treats fully transparent pixels as black", () => {
    const transparentWhite = new Uint8ClampedArray([255, 255, 255, 0]);
    const stats = calculatePixelStats(transparentWhite, 1, 1);
    assert.equal(stats.meanLuminance, 0);
    assert.equal(stats.minLuminance, 0);
    assert.equal(stats.maxLuminance, 0);
  });

  test("rejects invalid dimensions and mismatched pixel buffers", () => {
    assert.throws(() => calculatePixelStats(new Uint8ClampedArray(4), 0, 1), /positive integers/);
    assert.throws(() => calculatePixelStats(new Uint8ClampedArray(4), 2, 1), /buffer length/);
  });

  test("browser reader preserves aspect ratio and returns measurements from canvas pixels", async () => {
    const previousImage = globalThis.Image;
    const previousDocument = globalThis.document;
    let drawnSize;
    class FakeImage {
      naturalWidth = 256;
      naturalHeight = 128;
      set src(_value) { queueMicrotask(() => this.onload()); }
    }
    globalThis.Image = FakeImage;
    globalThis.document = {
      createElement: () => ({
        set width(value) { this._width = value; },
        get width() { return this._width; },
        set height(value) { this._height = value; },
        get height() { return this._height; },
        getContext: () => ({
          fillRect() {},
          drawImage(_image, _x, _y, width, height) { drawnSize = [width, height]; },
          getImageData: (_x, _y, width, height) => ({
            data: new Uint8ClampedArray(width * height * 4).fill(255),
          }),
        }),
      }),
    };

    try {
      const result = await inspectImagePixels("upload", "sample.png", "data:image/png;base64,test");
      assert.deepEqual(drawnSize, [128, 64]);
      assert.equal(result.width, 256);
      assert.equal(result.height, 128);
      assert.equal(result.meanLuminance, 255);
      assert.equal(result.sampledPixels, 128 * 64);
      assert.match(result.runId, /^PX-/);
    } finally {
      if (previousImage === undefined) delete globalThis.Image;
      else globalThis.Image = previousImage;
      if (previousDocument === undefined) delete globalThis.document;
      else globalThis.document = previousDocument;
    }
  });
});
