"""Export the FracAtlas ConvNeXt fracture classifier with an ONNX Grad-CAM output.

Requires torch, timm, onnx, onnxruntime, Pillow and a directory of FracAtlas
JPEG/PNG images for static int8 calibration. The upstream checkpoint is loaded
with weights_only=True because it is a downloaded third-party file.
"""

from __future__ import annotations

import argparse
import tempfile
from pathlib import Path

import numpy as np
import onnx
import onnxruntime as ort
import timm
import torch
from PIL import Image
from torch import nn
from torch.nn import functional as F
from onnxruntime.quantization import (
    CalibrationDataReader,
    QuantFormat,
    QuantType,
    quantize_static,
)


MODEL_NAME = "timm/convnext_tiny.fb_in22k_ft_in1k"
IMAGE_SIZE = 384
MEAN = (0.485, 0.456, 0.406)
STD = (0.229, 0.224, 0.225)


class FractureScoreAndCam(nn.Module):
    """Match the upstream score and export a Grad-CAM map for the last stage."""

    def __init__(self, model: nn.Module):
        super().__init__()
        self.model = model
        norm = model.head.norm
        if not isinstance(norm, nn.LayerNorm) or norm.normalized_shape != (768,):
            raise TypeError(f"Unexpected ConvNeXt head normalization: {norm!r}")
        self.register_buffer("norm_weight", norm.weight.detach().clone())
        self.register_buffer("norm_bias", norm.bias.detach().clone())
        self.norm_eps = norm.eps

    def forward(self, image: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        features = self.model.forward_features(image)
        pooled = self.model.head.global_pool(features).flatten(1)
        centered = pooled - pooled.mean(dim=1, keepdim=True)
        inv_std = torch.rsqrt(centered.square().mean(dim=1, keepdim=True) + self.norm_eps)
        normalized = centered * inv_std * self.norm_weight + self.norm_bias
        logits = self.model.head.fc(self.model.head.drop(normalized))

        # Analytic derivative of the LayerNorm + linear head with respect to
        # the pooled feature vector; spatial Grad-CAM averages out to this
        # vector up to one positive constant, which normalization removes.
        head_weight = self.model.head.fc.weight[0] * self.norm_weight
        normalized_centered = centered * inv_std
        grad = inv_std * (
            head_weight
            - head_weight.mean(dim=0, keepdim=True)
            - normalized_centered * (head_weight * normalized_centered).mean(dim=0, keepdim=True)
        )
        if grad.ndim != 2 or features.ndim != 4:
            raise RuntimeError(f"Unexpected Grad-CAM shapes: features={tuple(features.shape)}, grad={tuple(grad.shape)}")
        cam = F.relu((features * grad[:, :, None, None]).sum(dim=1, keepdim=True))
        cam = cam / cam.amax(dim=(-1, -2), keepdim=True).clamp(min=1e-8)
        return logits, cam


def preprocess(path: Path) -> np.ndarray:
    with Image.open(path) as source:
        gray = source.convert("L")
        width, height = gray.size
        scale = IMAGE_SIZE / max(width, height)
        new_width, new_height = max(1, round(width * scale)), max(1, round(height * scale))
        resized = gray.resize((new_width, new_height), Image.Resampling.BILINEAR)
        square = Image.new("L", (IMAGE_SIZE, IMAGE_SIZE), 0)
        square.paste(resized, ((IMAGE_SIZE - new_width) // 2, (IMAGE_SIZE - new_height) // 2))
        pixels = np.asarray(square, dtype=np.float32) / 255.0
    return np.stack([(pixels - mean) / std for mean, std in zip(MEAN, STD, strict=True)])[None]


def remove_activation_quantization(model: onnx.ModelProto) -> onnx.ModelProto:
    """Keep int8 weight storage but preserve float32 activations at inference."""
    initializer_names = {initializer.name for initializer in model.graph.initializer}
    quantizers = {
        node.output[0]: node
        for node in model.graph.node
        if node.op_type == "QuantizeLinear" and node.input[0] not in initializer_names
    }
    dequantizers = {
        node.output[0]: node
        for node in model.graph.node
        if node.op_type == "DequantizeLinear" and node.input[0] in quantizers
    }
    replacements = {
        output: quantizers[dequantizer.input[0]].input[0]
        for output, dequantizer in dequantizers.items()
    }
    while True:
        updated = {key: replacements.get(value, value) for key, value in replacements.items()}
        if updated == replacements:
            break
        replacements = updated
    kept_nodes = []
    for node in model.graph.node:
        if node.op_type == "QuantizeLinear" and node.output[0] in quantizers:
            continue
        if node.op_type == "DequantizeLinear" and node.output[0] in dequantizers:
            continue
        for index, value in enumerate(node.input):
            node.input[index] = replacements.get(value, value)
        kept_nodes.append(node)
    del model.graph.node[:]
    model.graph.node.extend(kept_nodes)
    model.graph.node.extend(
        onnx.helper.make_node("Identity", [replacements[output.name]], [output.name])
        for output in model.graph.output
        if output.name in replacements
    )
    return model


class ImageCalibrationReader(CalibrationDataReader):
    def __init__(self, paths: list[Path]):
        self.samples = iter({"image": preprocess(path)} for path in paths)

    def get_next(self):
        return next(self.samples, None)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", required=True, type=Path)
    parser.add_argument("--calibration-images", required=True, type=Path)
    parser.add_argument("--output", type=Path, default=Path("public/models/fracatlas-fracture-int8.onnx"))
    parser.add_argument("--calibration-count", type=int, default=128)
    args = parser.parse_args()

    with torch.serialization.safe_globals([torch.torch_version.TorchVersion]):
        checkpoint = torch.load(args.checkpoint, map_location="cpu", weights_only=True)
    model = timm.create_model(MODEL_NAME, pretrained=False, num_classes=1, drop_rate=0.0)
    model.load_state_dict(checkpoint["model_state"], strict=True)
    model.eval()
    exported = FractureScoreAndCam(model).eval()
    all_paths = sorted(
        path for path in args.calibration_images.rglob("*")
        if path.suffix.lower() in {".jpg", ".jpeg", ".png"}
    )
    selected = np.linspace(0, len(all_paths) - 1, min(args.calibration_count, len(all_paths))).round().astype(int)
    sample_paths = [all_paths[index] for index in selected]
    if len(sample_paths) < 8:
        raise RuntimeError("Provide at least 8 FracAtlas JPG/PNG images for calibration.")

    example = torch.from_numpy(preprocess(sample_paths[0]))
    with torch.inference_mode():
        expected_logits, expected_cams = exported(example)
        reference_logits = model(example)
    if not torch.allclose(expected_logits, reference_logits, atol=1e-5, rtol=1e-5):
        raise RuntimeError("Wrapper logits do not match the upstream classifier.")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    float_path = Path(tempfile.gettempdir()) / "fracatlas-fracture-fp32.onnx"
    torch.onnx.export(
        exported,
        (example,),
        str(float_path),
        input_names=["image"],
        output_names=["logit", "cam"],
        dynamic_axes={"image": {0: "batch"}, "logit": {0: "batch"}, "cam": {0: "batch"}},
        opset_version=17,
        dynamo=False,
    )
    graph = onnx.load(str(float_path))
    onnx.checker.check_model(graph)

    float_session = ort.InferenceSession(str(float_path), providers=["CPUExecutionProvider"])
    ort_logits, ort_cams = float_session.run(None, {"image": example.numpy()})
    if not np.allclose(ort_logits, expected_logits.numpy(), atol=1e-4, rtol=1e-4):
        raise RuntimeError("FP32 ONNX score differs from the upstream PyTorch model.")
    if not np.allclose(ort_cams, expected_cams.numpy(), atol=2e-4, rtol=2e-4):
        raise RuntimeError("FP32 ONNX Grad-CAM differs from the PyTorch Grad-CAM formula.")

    quantize_static(
        str(float_path),
        str(args.output),
        ImageCalibrationReader(sample_paths),
        quant_format=QuantFormat.QDQ,
        activation_type=QuantType.QInt8,
        weight_type=QuantType.QInt8,
        per_channel=True,
        op_types_to_quantize=["MatMul", "Gemm"],
    )
    quantized_graph = onnx.load(str(args.output))
    quantized_graph = remove_activation_quantization(quantized_graph)
    onnx.checker.check_model(quantized_graph)
    onnx.save(quantized_graph, str(args.output))
    quantized_session = ort.InferenceSession(str(args.output), providers=["CPUExecutionProvider"])
    max_score_delta = 0.0
    max_cam_delta = 0.0
    for path in sample_paths[: min(16, len(sample_paths))]:
        sample = preprocess(path)
        reference = float_session.run(None, {"image": sample})
        quantized = quantized_session.run(None, {"image": sample})
        max_score_delta = max(max_score_delta, float(np.max(np.abs(reference[0] - quantized[0]))))
        max_cam_delta = max(max_cam_delta, float(np.max(np.abs(reference[1] - quantized[1]))))
    print(f"Exported {MODEL_NAME} with {len(sample_paths)} FracAtlas calibration images.")
    print(f"ONNX int8 size: {args.output.stat().st_size:,} bytes")
    print(f"Max calibration score delta: {max_score_delta:.6f}; CAM delta: {max_cam_delta:.6f}")


if __name__ == "__main__":
    main()
