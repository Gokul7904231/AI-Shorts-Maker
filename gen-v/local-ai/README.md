# Local AI Video Generation (Foundational)

Personal AI content generation system — local-first video pipeline.

## Goals
- Local scene clip generation using **CogVideoX-2B** (short clips only: **4–8s**)
- Laptop-friendly memory optimization (16GB RAM target):
  - `enable_model_cpu_offload()`
  - `enable_vae_slicing()`
  - `enable_vae_tiling()`
- Local pipeline assembly with **FFmpeg**:
  - scene clips + voice audio + captions => final MP4
- Subtitle generation scaffolding (timestamped captions)
- Provider-agnostic architecture (LLM providers only; video remains local)

## Folder Layout
- `scripts/download_cogvideox.py`
- `scripts/generate_video.py`
- `scripts/generate_voice.py` (scaffolding; integrate your TTS later)
- `scripts/subtitle.py` (scaffolding; integrate your caption provider later)
- `scripts/render_video.py` (FFmpeg assembly)

## Quickstart (terminal-aware)
> Commands are Windows-friendly.

### 1) Create venv (recommended)
```bat
cd gen-v\local-ai
python -m venv venv
```

### 2) Activate venv
```bat
venv\Scripts\activate
```

### 3) Install requirements
```bat
pip install -r requirements.txt
```

### 4) Hugging Face login (if gated model)
```bat
huggingface-cli login
```

### 5) Download CogVideoX-2B to cache
```bat
python scripts\download_cogvideox.py
```

### 6) Smoke test (no full generation)
This verifies imports + pipeline construction without rendering full clips.
```bat
python scripts\generate_video.py --smoke-test
```

## Generation Notes (laptop optimization)
- Use low resolution first and short durations.
- The provided flags focus on reducing VRAM pressure.
- First run will be slow due to model download and initial compilation.

## Outputs
Generated assets are written to:
- `outputs/scene_clips/`
- `outputs/audio/`
- `outputs/subtitles/`
- `outputs/final/`

## Next Steps
- Wire `generate_voice.py` to your chosen TTS provider (e.g., Google Cloud TTS or local TTS).
- Wire `subtitle.py` to your caption provider (e.g., AssemblyAI) or local whisper.
- Wire `render_video.py` once you have: clip paths + audio path + captions (SRT/VTT).

