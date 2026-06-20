import argparse
import json
import sys
from pathlib import Path


def _read_job(job_json_path: Path) -> dict:
    raw = job_json_path.read_text(encoding="utf-8")
    return json.loads(raw)


def _ensure_output_dir(output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)


def _touch_placeholder(file_path: Path) -> None:
    # 0-byte placeholder (future pipeline will overwrite)
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_bytes(b"")


def _smoke_test() -> None:
    """
    Validates the environment and model path without loading weights.
    Exits 0 on pass, 1 on failure.
    """
    import subprocess
    import traceback
    errors = []

    # 1) Required package imports — use pip show (no CUDA init, no blocking)
    packages = ["torch", "diffusers", "transformers", "accelerate", "huggingface_hub"]
    for pkg in packages:
        try:
            result = subprocess.run(
                [sys.executable, "-m", "pip", "show", pkg],
                capture_output=True, text=True, timeout=10
            )
            if result.returncode == 0:
                version_line = next((l for l in result.stdout.splitlines() if l.startswith("Version:")), "")
                print(f"  [OK] {pkg} ({version_line})")
            else:
                errors.append(f"  [FAIL] {pkg} not installed")
                print(errors[-1])
        except Exception as e:
            errors.append(f"  [FAIL] {pkg}: {e}")
            print(errors[-1])

    # 2) Model path check
    model_id = "THUDM/CogVideoX-2b"
    hf_cache = Path.home() / ".cache" / "huggingface" / "hub"
    # HuggingFace stores as models--{org}--{name}
    model_cache_dir = hf_cache / "models--THUDM--CogVideoX-2b"
    # Also check the capitalised variant used by the download
    model_cache_dir_alt = hf_cache / "models--THUDM--CogVideoX-2B"
    found_path = None
    for candidate in [model_cache_dir, model_cache_dir_alt]:
        if candidate.exists():
            found_path = candidate
            break
    if found_path:
        snapshot_dir = found_path / "snapshots"
        snapshots = list(snapshot_dir.iterdir()) if snapshot_dir.exists() else []
        if snapshots:
            print(f"  [OK] Model path: {found_path}")
            print(f"       Snapshot:   {snapshots[0].name}")
        else:
            errors.append(f"  [FAIL] Model path exists but no snapshot: {found_path}")
            print(errors[-1])
    else:
        errors.append(f"  [FAIL] Model not found in HuggingFace cache for {model_id}")
        print(errors[-1])

    # 3) Incomplete download check
    if found_path:
        incomplete = list(found_path.rglob("*.incomplete"))
        if incomplete:
            errors.append(f"  [FAIL] {len(incomplete)} incomplete blob(s) found — download not finished:")
            for f in incomplete:
                errors[-1] += f"\n         {f.name}"
            print(errors[-1])
        else:
            print("  [OK] No .incomplete files — download finished")

    # 4) VRAM check (without initialising CUDA — just query driver via subprocess)
    try:
        import subprocess
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=name,memory.total,memory.free", "--format=csv,noheader,nounits"],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0:
            line = result.stdout.strip().splitlines()[0]
            gpu_name, total, free = [x.strip() for x in line.split(",")]
            total_gb = round(int(total) / 1024, 1)
            free_gb = round(int(free) / 1024, 1)
            print(f"  [OK] GPU: {gpu_name}  |  VRAM total: {total_gb}GB  |  Free: {free_gb}GB")
            if total_gb < 6:
                errors.append(f"  [WARN] VRAM {total_gb}GB < 6GB minimum for CogVideoX-2B (requires ~6-8GB with optimisations)")
                print(errors[-1])
        else:
            print(f"  [WARN] nvidia-smi failed: {result.stderr.strip()}")
    except Exception as e:
        print(f"  [WARN] Could not query GPU: {e}")

    # 5) Output dir write test
    try:
        test_out = Path(__file__).resolve().parent.parent / "output" / "_smoke_test"
        test_out.mkdir(parents=True, exist_ok=True)
        (test_out / "smoke.txt").write_text("ok")
        (test_out / "smoke.txt").unlink()
        test_out.rmdir()
        print("  [OK] Output directory write test passed")
    except Exception as e:
        errors.append(f"  [FAIL] Output write test: {e}")
        print(errors[-1])

    print()
    if errors:
        print(f"SMOKE TEST: FAILED ({len(errors)} issue(s))")
        sys.exit(1)
    else:
        print("SMOKE TEST: PASSED")
        sys.exit(0)


def main() -> None:
    parser = argparse.ArgumentParser(description="Python job runner for Next.js → Python bridge test")
    parser.add_argument(
        "jobJsonPath",
        nargs="?",
        type=str,
        help="Path to a job JSON file, e.g. generated/jobs/<jobId>.json",
    )
    parser.add_argument(
        "--smoke-test",
        action="store_true",
        help="Run environment + model readiness check without loading weights",
    )
    args = parser.parse_args()

    if args.smoke_test:
        print("=== generate_video.py smoke test ===")
        _smoke_test()
        return

    if not args.jobJsonPath:
        parser.error("jobJsonPath is required unless --smoke-test is specified")

    job_path = Path(args.jobJsonPath)
    if not job_path.exists():
        raise FileNotFoundError(f"Job JSON not found: {job_path}")

    job = _read_job(job_path)

    topic = str(job.get("topic", ""))
    script = str(job.get("script", ""))
    style = str(job.get("style", ""))
    scenes = job.get("scenes", [])
    if not isinstance(scenes, list):
        scenes = []

    job_id = job.get("jobId") or job_path.stem
    job_id = str(job_id)

    print("Loaded Job:")
    print(f"Topic: {topic}")
    print(f"Scene count: {len(scenes)}")

    # Required output contract:
    # local-ai/output/{jobId}/result.json
    # plus placeholder scene mp4 files.
    out_dir = Path(__file__).resolve().parent.parent / "output" / job_id
    _ensure_output_dir(out_dir)

    # Placeholder scene files. For now use scene_1..N filenames.
    # Contract in the task example uses scene1.mp4/scene2.mp4; keep that exact ordering.
    # If scenes length is 0, still create 2 placeholders to match the scaffold contract.
    placeholder_count = max(2, len(scenes))
    scene_files = [f"scene{i}.mp4" for i in range(1, placeholder_count + 1)]

    for name in scene_files:
        _touch_placeholder(out_dir / name)

    result = {
        "jobId": job_id,
        "status": "completed",
        "sceneFiles": scene_files,
    }

    (out_dir / "result.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Wrote result.json: {(out_dir / 'result.json').as_posix()}")


if __name__ == "__main__":
    main()
