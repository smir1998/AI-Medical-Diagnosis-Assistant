"""Export the TorchXRayVision 18-finding chest X-ray checkpoint to ONNX."""

from pathlib import Path
import sys
import tempfile

import torch
from torch.nn import functional as F
import torchxrayvision as xrv


MODEL_NAME = "densenet121-res224-all"
OUTPUT_PATH = Path(__file__).resolve().parents[1] / "public" / "models" / "xrv-densenet121-all.onnx"
CACHE_DIR = Path(tempfile.gettempdir()) / "medlens-xrv-cache"

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(errors="replace")


class ScoresAndClassActivationMaps(torch.nn.Module):
    """Expose the model's calibrated scores and linear-head class activation maps."""

    def __init__(self, model: torch.nn.Module):
        super().__init__()
        self.features = model.features
        self.classifier = model.classifier
        self.register_buffer("operating_points", model.op_threshs.detach().clone())

    def forward(self, image: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        feature_map = F.relu(self.features(image))
        pooled = F.adaptive_avg_pool2d(feature_map, (1, 1)).flatten(1)
        logits = self.classifier(pooled)

        raw_scores = torch.sigmoid(logits)
        points = self.operating_points.unsqueeze(0)
        scores = torch.where(
            raw_scores < points,
            raw_scores / (points * 2),
            1 - ((1 - raw_scores) / ((1 - points) * 2)),
        )

        # DenseNet's linear classifier follows global average pooling. Its
        # class activation maps are the exact spatial decomposition of logits.
        weights = self.classifier.weight.view(1, self.classifier.out_features, -1, 1, 1)
        cams = F.relu((feature_map.unsqueeze(1) * weights).sum(dim=2))
        peak = cams.amax(dim=(-1, -2), keepdim=True).clamp(min=1e-8)
        cams = cams / peak
        return scores, cams


def main() -> None:
    model = xrv.models.DenseNet(weights=MODEL_NAME, cache_dir=str(CACHE_DIR)).cpu().eval()
    export_model = ScoresAndClassActivationMaps(model).eval()
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    example = torch.zeros(1, 1, 224, 224, dtype=torch.float32)

    with torch.inference_mode():
        reference_scores = model(example)
        reference_export_scores, reference_cams = export_model(example)
        if not torch.allclose(reference_scores, reference_export_scores, atol=1e-6, rtol=1e-6):
            raise RuntimeError("Export wrapper scores do not match the TorchXRayVision model.")

    torch.onnx.export(
        export_model,
        (example,),
        str(OUTPUT_PATH),
        input_names=["image"],
        output_names=["scores", "cams"],
        dynamic_axes={
            "image": {0: "batch"},
            "scores": {0: "batch"},
            "cams": {0: "batch"},
        },
        opset_version=17,
        dynamo=False,
    )

    import onnx

    graph = onnx.load(str(OUTPUT_PATH))
    onnx.checker.check_model(graph)
    import onnxruntime as ort

    session = ort.InferenceSession(str(OUTPUT_PATH), providers=["CPUExecutionProvider"])
    onnx_scores, onnx_cams = session.run(None, {"image": example.numpy()})
    if not torch.allclose(torch.from_numpy(onnx_scores), reference_scores, atol=1e-5, rtol=1e-5):
        raise RuntimeError("ONNX scores do not match TorchXRayVision scores.")
    if not torch.allclose(torch.from_numpy(onnx_cams), reference_cams, atol=1e-5, rtol=1e-5):
        raise RuntimeError("ONNX activation maps do not match the export wrapper.")
    print(f"Exported {MODEL_NAME} to {OUTPUT_PATH} ({OUTPUT_PATH.stat().st_size:,} bytes)")
    print("Findings:", ", ".join(model.targets))


if __name__ == "__main__":
    main()
