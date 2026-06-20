import json
import argparse
import subprocess
import os
import time
import shutil
from pathlib import Path
import firebase_admin
from firebase_admin import credentials, firestore
import cloudinary
import cloudinary.uploader

# Initialize Cloudinary Configuration
cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
    api_key=os.environ.get("CLOUDINARY_API_KEY"),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET"),
    secure=True
)


# MoviePy (and imageio-ffmpeg) often need an explicit ffmpeg binary on Windows.
# Must be set before importing/initializing MoviePy.
try:
    import imageio_ffmpeg  # type: ignore

    os.environ["IMAGEIO_FFMPEG_EXE"] = imageio_ffmpeg.get_ffmpeg_exe()
    print(f"[ffmpeg] IMAGEIO_FFMPEG_EXE={os.environ['IMAGEIO_FFMPEG_EXE']}")
except Exception as e:
    print(f"[ffmpeg] imageio_ffmpeg fallback not available: {e}")

cache = {"hits": 0, "misses": 0}

def _init_firebase() -> None:
    if firebase_admin._apps:
        return
        
    bucket_name = os.environ.get("FIREBASE_STORAGE_BUCKET")
    sa_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
    
    if sa_json:
        try:
            cred = credentials.Certificate(json.loads(sa_json))
            firebase_admin.initialize_app(cred, {"storageBucket": bucket_name})
            print("[Firebase] Initialized with Service Account JSON.")
            return
        except Exception as e:
            print(f"[Firebase] Service Account JSON init failed: {e}")
            
    private_key = os.environ.get("FIREBASE_PRIVATE_KEY")
    client_email = os.environ.get("FIREBASE_CLIENT_EMAIL")
    project_id = os.environ.get("FIREBASE_PROJECT_ID")
    
    if private_key and client_email and project_id:
        try:
            cred_dict = {
                "type": "service_account",
                "project_id": project_id,
                "private_key": private_key.replace("\\n", "\n"),
                "client_email": client_email,
                "token_uri": "https://oauth2.googleapis.com/token"
            }
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred, {"storageBucket": bucket_name})
            print("[Firebase] Initialized with individual parameters.")
            return
        except Exception as e:
            print(f"[Firebase] Individual parameters init failed: {e}")
            
    try:
        firebase_admin.initialize_app(options={"storageBucket": bucket_name})
        print("[Firebase] Initialized with default credentials.")
    except Exception as e:
        print(f"[Firebase] Fallback initialization failed: {e}")


def _preprocess_resize_image(img_path: Path, target_w: int = 1080, target_h: int = 1920) -> None:
    from PIL import Image
    try:
        if not img_path.exists() or img_path.stat().st_size <= 0:
            return
        with Image.open(img_path) as im:
            if im.size != (target_w, target_h):
                print(f"[PIL] Resizing image {img_path.name} from {im.size} to {(target_w, target_h)}")
                resized = im.resize((target_w, target_h), Image.Resampling.LANCZOS)
                resized.save(img_path)
    except Exception as e:
        print(f"[PIL] Error resizing image {img_path}: {e}")


def _finalize_render_and_upload(
    job_id: str,
    out_dir: Path,
    out_final: Path,
    out_thumbnail: Path,
    out_srt: Path,
    timings: dict,
    subtitle_meta: dict,
    probe: dict,
    cache_hits: int,
    cache_misses: int,
    is_quiz: bool = False,
    video_duration: float | None = None,
    start_time: float = 0.0,
) -> None:
    total_execution_seconds = int(time.time() - start_time)
    video_size_mb = 0.0
    if out_final.exists():
        video_size_mb = round(os.path.getsize(out_final) / (1024 * 1024), 2)
        
    _init_firebase()
    
    video_url = None
    thumbnail_url = None
    subtitles_url = None
    cloudinary_public_id = None
    cloudinary_thumb_id = None
    cloudinary_srt_id = None
    
    try:
        print(f"[Cloudinary] Uploading {out_final} as video...")
        video_upload = cloudinary.uploader.upload(
            str(out_final),
            resource_type="video",
            folder=f"ai_shorts/{job_id}",
            overwrite=True
        )
        video_url = video_upload.get("secure_url")
        cloudinary_public_id = video_upload.get("public_id")
        print(f"[Cloudinary] Video uploaded. URL: {video_url}, Public ID: {cloudinary_public_id}")
        
        if out_thumbnail.exists():
            print(f"[Cloudinary] Uploading {out_thumbnail} as image...")
            thumb_upload = cloudinary.uploader.upload(
                str(out_thumbnail),
                resource_type="image",
                folder=f"ai_shorts/{job_id}",
                overwrite=True
            )
            thumbnail_url = thumb_upload.get("secure_url")
            cloudinary_thumb_id = thumb_upload.get("public_id")
            print(f"[Cloudinary] Thumbnail uploaded. URL: {thumbnail_url}, Public ID: {cloudinary_thumb_id}")
            
        if out_srt.exists():
            print(f"[Cloudinary] Uploading {out_srt} as raw file...")
            srt_upload = cloudinary.uploader.upload(
                str(out_srt),
                resource_type="raw",
                folder=f"ai_shorts/{job_id}",
                overwrite=True
            )
            subtitles_url = srt_upload.get("secure_url")
            cloudinary_srt_id = srt_upload.get("public_id")
            print(f"[Cloudinary] Subtitles uploaded. URL: {subtitles_url}, Public ID: {cloudinary_srt_id}")
            
        db = firestore.client()
        doc_ref = db.collection("videos").document(job_id)
        dur = video_duration if video_duration is not None else probe.get("duration", 0.0)
        
        update_payload = {
            "status": "completed",
            "videoUrl": video_url,
            "thumbnailUrl": thumbnail_url,
            "subtitlesUrl": subtitles_url,
            "cloudinaryPublicId": cloudinary_public_id,
            "cloudinaryThumbnailPublicId": cloudinary_thumb_id,
            "cloudinarySubtitlesPublicId": cloudinary_srt_id,
            "renderDurationSeconds": total_execution_seconds,
            "videoSizeMb": video_size_mb,
            "fps": subtitle_meta.get("fps", 18 if is_quiz else 24),
            "resolution": subtitle_meta.get("resolution", "540x960" if is_quiz else "720x1280"),
            "timings": timings,
            "cache": {"hits": cache_hits, "misses": cache_misses},
            "playable": probe.get("playable", True),
            "audioDetected": probe.get("audioDetected", True),
            "videoDuration": dur,
        }
        print(f"[Firebase] Updating Firestore document {job_id}...")
        doc_ref.set(update_payload, merge=True)
        print("[Firebase] Firestore update complete.")
    except Exception as e:
        print(f"[ERROR][Cloudinary/Firebase] Upload or Firestore update failed: {e}")
        try:
            db = firestore.client()
            db.collection("videos").document(job_id).set({"status": "failed", "error": str(e)}, merge=True)
        except Exception:
            pass
        raise
        
    print("[Cleanup] Dropping temporary WAV cuts and local assets...")
    temp_dir = out_dir / "temp"
    if temp_dir.exists():
        try:
            shutil.rmtree(str(temp_dir), ignore_errors=True)
        except Exception:
            pass
    images_dir = out_dir / "images"
    if images_dir.exists():
        try:
            shutil.rmtree(str(images_dir), ignore_errors=True)
        except Exception:
            pass
    for local_file in [out_final, out_thumbnail, out_srt]:
        if local_file.exists():
            try:
                local_file.unlink()
            except Exception:
                pass

def _run(cmd: list[str], *, cwd: Path | None = None) -> None:
    print("Running:", " ".join(cmd))
    subprocess.run(cmd, check=True, cwd=str(cwd) if cwd else None)


def _edge_tts(text: str, out_wav: Path, voice: str = "en-US-GuyNeural", rate: str | None = None) -> None:
    """Generate edge-tts audio into TEMP then copy bytes into final contract file.

    Windows sometimes keeps a lock on edge-tts fresh output; this function
    avoids file-move style operations by using a temp filename and binary copy.

    """

    import shutil as _shutil
    import time as _sleep

    out_wav.parent.mkdir(parents=True, exist_ok=True)

    # STEP 2 fix: always generate to a temp/ file first.
    temp_dir = out_wav.parent / "temp"
    temp_dir.mkdir(parents=True, exist_ok=True)

    temp_audio = temp_dir / "temp_audio"
    # edge-tts can create either extensionless or .wav; we probe for both.
    temp_prefix = temp_audio  # edge-tts uses --write-media prefix

    # Invoke edge-tts with retry logic for network resilience.
    cmd = [
        "edge-tts",
        "--text",
        text,
        "--voice",
        voice,
        "--write-media",
        str(temp_prefix),
    ]
    if rate:
        cmd.extend(["--rate", rate])
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            _run(cmd)
            break
        except Exception as e:
            if attempt == max_retries - 1:
                print(f"[EDGE-TTS] Failed after {max_retries} attempts: {e}")
                raise
            sleep_time = 2 ** attempt
            print(f"[EDGE-TTS] Attempt {attempt + 1} failed. Retrying in {sleep_time}s... Error: {e}")
            _sleep.sleep(sleep_time)

    generated_wav = temp_prefix.with_suffix(".wav")
    generated_extless = temp_prefix

    def _is_readable_file(p: Path) -> bool:
        try:
            if not p.exists() or p.stat().st_size <= 0:
                return False
            # Can we open it for binary read?
            with open(p, "rb") as f:
                f.read(1)
            return True
        except Exception:
            return False

    # STEP 2 verification polling: wait until temp audio becomes readable.
    temp_candidate: Path | None = None
    for _attempt in range(40):  # ~10 seconds total (0.25s*40)
        if _is_readable_file(generated_wav):
            temp_candidate = generated_wav
            break
        if _is_readable_file(generated_extless):
            temp_candidate = generated_extless
            break
        _sleep.sleep(0.25)

    if temp_candidate is None:
        raise RuntimeError(
            "[STEP 2] edge-tts temp output never became readable. "
            f"Tried: {generated_wav} and extless {generated_extless}."
        )

    temp_size = temp_candidate.stat().st_size
    print(f"[AUDIO] temp readable: {temp_candidate.as_posix()} (size={temp_size})")

    # Fail-fast validation before overwriting contract file.
    minimal_threshold = 256  # bytes; adjust upward if needed
    if temp_size < minimal_threshold:
        raise RuntimeError(
            f"[STEP 2] Invalid temp audio size={temp_size} bytes (<{minimal_threshold})."
        )

    # STEP 3: copy bytes into final contract file WITHOUT rename/replace.
    with open(temp_candidate, "rb") as src:
        with open(out_wav, "wb") as dst:
            dst.write(src.read())
            dst.flush()
            os.fsync(dst.fileno())

    # Optional stabilization.
    _sleep.sleep(0.75)

    # STEP 2 verification log + fail-fast after copy.
    if not out_wav.exists():
        raise RuntimeError(f"[STEP 2] audio.wav copy failed: {out_wav} does not exist")

    out_size = out_wav.stat().st_size
    print(f"[AUDIO] copy success -> audio.wav: {out_wav.as_posix()} (size={out_size})")
    if out_size < minimal_threshold:
        raise RuntimeError(
            f"[STEP 2] audio.wav invalid size={out_size} bytes (<{minimal_threshold})"
        )


def _write_placeholder_image(out_png: Path, title: str) -> None:
    from PIL import Image, ImageDraw, ImageFont

    w, h = 1080, 1920
    img = Image.new("RGB", (w, h), color=(18, 18, 18))
    draw = ImageDraw.Draw(img)

    try:
        font_title = ImageFont.truetype("arial.ttf", 40)
        font_sub = ImageFont.truetype("arial.ttf", 26)
    except Exception:
        font_title = ImageFont.load_default()
        font_sub = ImageFont.load_default()

    title = (title or "").strip() or "Scene"

    max_chars = 24
    lines = [title[i : i + max_chars] for i in range(0, len(title), max_chars)]
    lines = lines[:6]

    y = 120
    for line in lines:
        tw = draw.textlength(line, font=font_title)
        draw.text(((w - tw) / 2, y), line, font=font_title, fill=(240, 240, 240))
        y += 60

    footer = "Generated placeholder"
    tw = draw.textlength(footer, font=font_sub)
    draw.text(((w - tw) / 2, h - 140), footer, font=font_sub, fill=(150, 150, 150))

    out_png.parent.mkdir(parents=True, exist_ok=True)
    img.save(out_png)


def _build_flux_scene_prompt(topic: str, scene_text: str, scene_image_prompt: str, style: str, i: int) -> str:
    topic = (topic or "").strip()
    scene_text = (scene_text or "").strip()
    scene_image_prompt = (scene_image_prompt or "").strip()
    style = (style or "").strip()

    base = (
        f"Topic: {topic}. "
        if topic
        else ""
    )

    prompt_parts = [
        base.strip(),
        f"Scene {i}: {scene_text}" if scene_text else f"Scene {i}",
        f"Style: {style}" if style else "",
        scene_image_prompt,
        "Motivational cinematic, realistic photography, dynamic composition, golden hour lighting, shallow depth of field",
        "camera angle: slightly low, subject in foreground, city/background with depth",
        "ultra-detailed, high contrast, no text, no watermark",
    ]

    prompt = ", ".join([p for p in prompt_parts if p])
    return prompt[:2000]


def _sha256_text(s: str) -> str:
    import hashlib

    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def _get_cache_root() -> Path:
    script_parent = Path(__file__).resolve().parent
    engine_root = script_parent.parent
    if "vps-rendering-engine" in str(script_parent.resolve()):
        return engine_root / "output" / "image-cache"
    else:
        repo_root = script_parent.parent
        return repo_root / "gen-v" / "generated" / "image-cache"


def _cache_paths(cache_key: str) -> tuple[Path, Path]:
    cache_root = _get_cache_root()
    img_path = cache_root / f"{cache_key}.png"
    meta_path = cache_root / f"{cache_key}.json"
    return img_path, meta_path


def _flux_generate_image_url(
    prompt: str,
    *,
    model: str = "black-forest-labs/FLUX.1-schnell",
    width: int = 1024,
    height: int = 1024,
    steps: int = 4,
) -> str:
    import requests

    api_key = os.environ.get("TOGETHER_API_KEY")
    if not api_key:
        raise RuntimeError(
            "TOGETHER_API_KEY env var is missing; cannot call FLUX Schnell via Together API."
        )

    url = "https://api.together.xyz/v1/images/generations"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "prompt": prompt,
        "width": width,
        "height": height,
        "steps": steps,
        "n": 1,
        "response_format": "url",
    }

    r = requests.post(url, headers=headers, json=payload, timeout=300)
    if r.status_code >= 300:
        raise RuntimeError(f"FLUX request failed: HTTP {r.status_code}: {r.text[:500]}")

    data = r.json()
    image_url = None
    if isinstance(data, dict):
        arr = data.get("data")
        if isinstance(arr, list) and arr:
            first = arr[0]
            if isinstance(first, dict):
                image_url = first.get("url")

    if not image_url:
        keys = list(data.keys()) if isinstance(data, dict) else type(data)
        raise RuntimeError(
            "FLUX response missing data[0].url. "
            f"keys={keys}"
        )

    return str(image_url)


def _generate_or_load_cached_image(
    prompt: str,
    out_png: Path,
    model: str = "black-forest-labs/FLUX.1-schnell",
    width: int = 1024,
    height: int = 1024,
    steps: int = 4,
) -> None:
    cache_key = _sha256_text(prompt)
    cache_img_path, cache_meta_path = _cache_paths(cache_key)

    try:
        if cache_img_path.exists() and cache_img_path.stat().st_size > 0:
            out_png.parent.mkdir(parents=True, exist_ok=True)
            cache["hits"] = cache.get("hits", 0) + 1
            shutil.copyfile(str(cache_img_path), str(out_png))
            return

        cache["misses"] = cache.get("misses", 0) + 1
        image_url = _flux_generate_image_url(
            prompt,
            model=model,
            width=width,
            height=height,
            steps=steps,
        )

        cache_img_path.parent.mkdir(parents=True, exist_ok=True)
        _download_image(image_url, cache_img_path)

        meta = {
            "prompt": prompt,
            "model": model,
            "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "width": width,
            "height": height,
        }
        cache_meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")

        out_png.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(str(cache_img_path), str(out_png))
    except Exception:
        raise


def _download_image(url: str, out_path: Path) -> None:
    import requests

    out_path.parent.mkdir(parents=True, exist_ok=True)
    resp = requests.get(url, timeout=120)
    if resp.status_code >= 300:
        raise RuntimeError(f"Image download failed: HTTP {resp.status_code}")

    out_path.write_bytes(resp.content)


def _seconds_from_srt_time(ts: str) -> float:
    # format: HH:MM:SS,mmm
    hh = int(ts[0:2])
    mm = int(ts[3:5])
    ss = int(ts[6:8])
    ms = int(ts[9:12])
    return hh * 3600 + mm * 60 + ss + ms / 1000.0


def _transcribe_to_srt(audio_wav: Path, out_srt: Path) -> None:
    from faster_whisper import WhisperModel

    model = WhisperModel("small", compute_type="int8", device="cpu")
    segments, _info = model.transcribe(str(audio_wav), beam_size=1, vad_filter=True)

    out_srt.parent.mkdir(parents=True, exist_ok=True)
    with open(out_srt, "w", encoding="utf-8") as f:
        idx = 1
        for seg in segments:
            text = (seg.text or "").strip()
            if not text:
                continue

            start = seg.start
            end = seg.end

            def fmt(t: float) -> str:
                hh = int(t // 3600)
                t = t - hh * 3600
                mm = int(t // 60)
                t = t - mm * 60
                ss = int(t)
                ms = int(round((t - ss) * 1000))
                return f"{hh:02d}:{mm:02d}:{ss:02d},{ms:03d}"

            f.write(f"{idx}\n")
            f.write(f"{fmt(start)} --> {fmt(end)}\n")
            f.write(f"{text}\n\n")
            idx += 1


def _load_total_duration_from_srt(srt_path: Path) -> float:
    if not srt_path.exists():
        return 10.0

    lines = srt_path.read_text(encoding="utf-8").splitlines()
    times: list[float] = []
    for line in lines:
        if " --> " in line:
            parts = line.split(" --> ")
            if len(parts) == 2:
                times.append(_seconds_from_srt_time(parts[1].strip()))

    return max(times) if times else 10.0


def _probe_with_ffprobe(out_mp4: Path) -> dict:
    ffprobe = shutil.which("ffprobe")
    if not ffprobe:
        return {"playable": False, "duration": None, "audioDetected": False}

    try:
        cmd = [
            ffprobe,
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-show_streams",
            "-of",
            "json",
            str(out_mp4),
        ]
        p = subprocess.run(cmd, capture_output=True, text=True, check=False)
        if p.returncode != 0:
            return {"playable": False, "duration": None, "audioDetected": False}

        data = json.loads(p.stdout)
        duration = None
        if "format" in data and "duration" in data["format"]:
            try:
                duration = float(data["format"]["duration"])
            except Exception:
                duration = None

        audioDetected = False
        for s in data.get("streams", []) or []:
            if s.get("codec_type") == "audio":
                audioDetected = True
                break

        playable = duration is not None and duration > 0
        return {"playable": playable, "duration": duration, "audioDetected": audioDetected}
    except Exception:
        return {"playable": False, "duration": None, "audioDetected": False}


def _get_windows_font_candidates() -> list[str | None]:
    candidates: list[str | None] = [
        None,
        "Arial.ttf",
        "arial.ttf",
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/Arial.ttf",
        "C:/Windows/Fonts/tahoma.ttf",
        "C:/Windows/Fonts/verdana.ttf",
        "C:/Windows/Fonts/calibri.ttf",
    ]
    return candidates


def _assemble_video(
    job_id: str,
    render_profile: str,
    images: list[Path],
    audio_wav: Path,
    subtitles_srt: Path,
    out_mp4: Path,
) -> dict:
    # Pre-resize all source images to exactly 1080x1920 to avoid MoviePy scaling overhead
    for img in images:
        _preprocess_resize_image(img, 1080, 1920)

    from moviepy.video.VideoClip import TextClip
    from moviepy.video.compositing.CompositeVideoClip import CompositeVideoClip
    from moviepy.video.VideoClip import ImageClip
    from moviepy import AudioFileClip

    from moviepy.video.tools.subtitles import SubtitlesClip

    RENDER_PROFILES = {
        "FAST_PREVIEW": {
            "fps": 18,
            "width": 540,
            "height": 960,
            "moviepy_preset": "ultrafast",
            "ffmpeg_threads": 2,
            "subtitle_fontsize": 30,
            "crossfade_dur": 0.35,
        },
        "LOW_MEMORY": {
            "fps": 18,
            "width": 540,
            "height": 960,
            "moviepy_preset": "ultrafast",
            "ffmpeg_threads": 1,
            "subtitle_fontsize": 30,
            "crossfade_dur": 0.0,
        },
        "STANDARD_SHORTS": {
            "fps": 24,
            "width": 720,
            "height": 1280,
            "moviepy_preset": "medium",
            "ffmpeg_threads": 2,
            "subtitle_fontsize": 34,
            "crossfade_dur": 0.4,
        },
        "STANDARD": {
            "fps": 24,
            "width": 720,
            "height": 1280,
            "moviepy_preset": "medium",
            "ffmpeg_threads": 2,
            "subtitle_fontsize": 34,
            "crossfade_dur": 0.4,
        },
        "HIGH_QUALITY": {
            "fps": 30,
            "width": 1080,
            "height": 1920,
            "moviepy_preset": "slow",
            "ffmpeg_threads": 2,
            "subtitle_fontsize": 40,
            "crossfade_dur": 0.45,
        },
    }

    profile_key = str(render_profile or "STANDARD_SHORTS").strip() or "STANDARD_SHORTS"
    profile = RENDER_PROFILES.get(profile_key, RENDER_PROFILES["STANDARD_SHORTS"])

    total_duration = _load_total_duration_from_srt(subtitles_srt)

    n = max(1, len(images))
    per = total_duration / n

    clips = []

    MOTION_ARCHETYPES = {
        "cinematic_drift": {
            "zoom_min": 1.00,
            "zoom_max": 1.07,
            "pan_strength": 0.030,
            "drift_freq": 0.20,
            "drift_amp": 0.55,
        },
        "slow_push_in": {
            "zoom_min": 1.02,
            "zoom_max": 1.10,
            "pan_strength": 0.020,
            "drift_freq": 0.12,
            "drift_amp": 0.35,
        },
        "documentary_pan": {
            "zoom_min": 1.00,
            "zoom_max": 1.06,
            "pan_strength": 0.040,
            "drift_freq": 0.18,
            "drift_amp": 0.20,
        },
        "floating_motion": {
            "zoom_min": 1.00,
            "zoom_max": 1.08,
            "pan_strength": 0.025,
            "drift_freq": 0.25,
            "drift_amp": 0.70,
        },
    }

    archetype_keys = list(MOTION_ARCHETYPES.keys())
    target_w, target_h = int(profile["width"]), int(profile["height"])

    for i, img in enumerate(images):
        duration = per
        if i == n - 1:
            duration = max(0.1, total_duration - per * (n - 1))

        base = ImageClip(str(img)).with_duration(duration)
        w, h = base.size

        import hashlib
        import math

        def _hash01(s: str) -> float:
            hv = hashlib.sha256(s.encode("utf-8")).hexdigest()
            return (int(hv[:8], 16) % 10_000_000) / 10_000_000

        motion_seed = f"{job_id}::scene::{i}::{str(img)}"

        rk = archetype_keys[int(_hash01(motion_seed + "::archetype") * len(archetype_keys)) % len(archetype_keys)]
        arch = MOTION_ARCHETYPES[rk]

        pan_dir = -1 if _hash01(motion_seed + "::panDir") < 0.5 else 1
        vert_dir = -1 if _hash01(motion_seed + "::vertDir") < 0.5 else 1
        zoom_dir = 1 if _hash01(motion_seed + "::zoomDir") < 0.5 else -1

        pan_px = max(6, int(min(w, h) * 0.02)) * (1.0 + 0.25 * _hash01(motion_seed + "::panAmp"))
        pan_px = pan_px * pan_dir * float(arch["pan_strength"] / 0.03)

        cx = (w / 2) - (target_w / 2)
        cy = (h / 2) - (target_h / 2)

        drift_phase = _hash01(motion_seed + "::driftPhase") * 2 * math.pi
        drift_freq = float(arch["drift_freq"]) * (0.85 + 0.3 * _hash01(motion_seed + "::driftFreqVar"))
        drift_amp = float(arch["drift_amp"]) * (0.65 + 0.5 * _hash01(motion_seed + "::driftAmpVar"))

        def zoom(t, _dur=duration):
            if _dur <= 0:
                return 1.0
            fx = max(0.0, min(1.0, t / _dur))

            z0 = float(arch["zoom_min"])
            z1 = float(arch["zoom_max"])
            base_z = z0 + (z1 - z0) * fx

            if zoom_dir < 0:
                base_z = z1 - (z1 - z0) * fx

            base_z += 0.004 * math.sin(2 * math.pi * fx + _hash01(motion_seed + "::phase") * 10)
            return max(1.0, min(1.18, base_z))

        moved = base.resized(lambda t: zoom(t))

        def _pos(t, _cx=cx, _cy=cy, _dur=duration, _pan=pan_px, _vdir=vert_dir):
            if _dur <= 0:
                return (_cx, _cy)
            fx = t / _dur
            x = _cx + _pan * (2 * fx - 1)
            y_drift = drift_amp * abs(_pan) * 0.02 * math.sin((2 * math.pi * drift_freq * fx) + drift_phase)
            y = _cy + (_pan * 0.08 * _vdir) * math.sin(math.pi * fx) + y_drift
            return (x, y)

        moved_cropped = moved.crop(
            x1=lambda t: _pos(t)[0],
            y1=lambda t: _pos(t)[1],
            x2=lambda t: _pos(t)[0] + target_w,
            y2=lambda t: _pos(t)[1] + target_h,
        )

        clips.append(moved_cropped)

    crossfade_dur = float(profile["crossfade_dur"])

    if len(clips) == 1:
        video = clips[0].with_audio(AudioFileClip(str(audio_wav)))
    else:
        composite_clips = []
        current = clips[0]
        for idx in range(1, len(clips)):
            nxt = clips[idx]
            overlap = min(crossfade_dur, current.duration / 2, nxt.duration / 2)
            current_end = current.duration

            if overlap > 0:
                current = current.crossfadeout(overlap)
                nxt = nxt.crossfadein(overlap)
                nxt = nxt.set_start(current_end - overlap)
            else:
                nxt = nxt.set_start(current_end)

            composite_clips.append(current)
            current = nxt

        composite_clips.append(current)

        video = CompositeVideoClip(composite_clips, size=(target_w, target_h)).with_audio(
            AudioFileClip(str(audio_wav)).subclip(0, total_duration)
        )

    subtitleOverlay = "FALLBACK"

    try:
        last_err = None
        for font_candidate in _get_windows_font_candidates():
            try:
                def generator(txt: str, _font=font_candidate):
                    return (
                        TextClip(
                            txt,
                            font=_font,
                            fontsize=int(profile["subtitle_fontsize"]),
                            color="white",
                            stroke_color="black",
                            stroke_width=2,
                            method="caption",
                            size=(video.w * 0.9, None),
                        ).set_position(("center", "bottom"))
                    )

                subs = SubtitlesClip(str(subtitles_srt), generator)
                subs = subs.set_duration(video.duration)
                final = CompositeVideoClip([video, subs])
                subtitleOverlay = "WORKING"
                break
            except Exception as e:
                last_err = e
                continue
        else:
            final = video
    except Exception:
        final = video

    out_mp4.parent.mkdir(parents=True, exist_ok=True)

    import os
    final_threads = os.cpu_count() or 4
    final.write_videofile(
        str(out_mp4),
        fps=profile["fps"],
        codec="libx264",
        audio_codec="aac",
        threads=final_threads,
        preset="ultrafast",
        logger=None,
    )

    return {
        "subtitleOverlay": subtitleOverlay,
        "renderProfile": profile_key,
        "fps": profile["fps"],
        "resolution": f"{target_w}x{target_h}",
    }


def _log_step_time(step: int, start_ts: float) -> float:
    dt = time.time() - start_ts
    print(f"STEP {step} time: {dt:.2f}s")
    return dt


def get_font(font_name: str, size: int):
    from PIL import ImageFont
    try:
        return ImageFont.truetype(font_name, size)
    except Exception:
        try:
            return ImageFont.truetype("arial.ttf", size)
        except Exception:
            return ImageFont.load_default()


def run_quiz_shorts(job: dict, out_dir: Path, out_audio: Path, out_srt: Path, out_final: Path, out_thumbnail: Path, timings: dict) -> dict:
    import wave
    import numpy as np
    from PIL import Image, ImageDraw, ImageFont
    from moviepy.video.VideoClip import VideoClip
    from moviepy import AudioFileClip

    topic = str(job.get("topic", ""))
    quiz_data = job.get("quizData", {})
    job_id = str(job.get("jobId") or out_dir.name)

    topic_lower = topic.lower()
    if "india" in topic_lower or "cricket" in topic_lower:
        theme = "india_theme"
    elif "geography" in topic_lower or "country" in topic_lower or "flag" in topic_lower or "capital" in topic_lower or "uk" in topic_lower or "mexico" in topic_lower or "london" in topic_lower or "map" in topic_lower:
        theme = "geography_theme"
    elif "science" in topic_lower or "space" in topic_lower or "physics" in topic_lower or "chemistry" in topic_lower or "biology" in topic_lower or "math" in topic_lower:
        theme = "science_theme"
    elif "sports" in topic_lower or "football" in topic_lower or "olympic" in topic_lower or "game" in topic_lower:
        theme = "sports_theme"
    elif "history" in topic_lower or "world" in topic_lower:
        theme = "world_theme"
    else:
        theme = "world_theme"

    script_parent = Path(__file__).resolve().parent
    engine_root = script_parent.parent
    
    if "vps-rendering-engine" in str(script_parent.resolve()):
        bg_path = engine_root / "assets" / "backgrounds" / f"{theme}.png"
        if not bg_path.exists():
            bg_path = engine_root / "assets" / "backgrounds" / "world_theme.png"
    else:
        repo_root = script_parent.parent
        bg_path = repo_root / "hybrid-video" / "assets" / "backgrounds" / f"{theme}.png"
        if not bg_path.exists():
            bg_path = repo_root / "hybrid-video" / "assets" / "backgrounds" / "world_theme.png"

    print(f"[QUIZ] Selected background theme: {theme} (path: {bg_path.as_posix()})")

    temp_dir = out_dir / "temp"
    temp_dir.mkdir(parents=True, exist_ok=True)

    step2_start = time.time()
    ffmpeg_exe = os.environ.get("IMAGEIO_FFMPEG_EXE", "ffmpeg")

    def generate_tts_wav(text, out_wav_path, rate=None):
        temp_mp3 = out_wav_path.with_suffix(".mp3")
        _edge_tts(text, temp_mp3, rate=rate)
        _run([ffmpeg_exe, "-i", str(temp_mp3), "-acodec", "pcm_s16le", "-ar", "24000", "-ac", "1", "-y", str(out_wav_path)])
        try:
            temp_mp3.unlink()
        except Exception:
            pass

    silence1_path = temp_dir / "silence1.wav"
    silence2_path = temp_dir / "silence2.wav"

    _run([ffmpeg_exe, "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", "0.3", "-y", str(silence1_path)])
    _run([ffmpeg_exe, "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", "1.0", "-y", str(silence2_path)])

    hook_path = temp_dir / "hook.wav"
    generate_tts_wav(quiz_data.get("hook", "Let's test your knowledge."), hook_path, rate="+20%")

    questions = quiz_data.get("questions", [])
    for idx, q in enumerate(questions):
        num = idx + 1
        q_wav_path = temp_dir / f"q{num}.wav"
        a_wav_path = temp_dir / f"a{num}.wav"
        exp_wav_path = temp_dir / f"exp{num}.wav"

        q_narr = f"Question {num}. {q['question']}"
        a_narr = f"{q['answer']}"
        exp_narr = q.get("explanation", "").strip()

        generate_tts_wav(q_narr, q_wav_path, rate="+25%")
        generate_tts_wav(a_narr, a_wav_path, rate="+20%")
        if exp_narr:
            generate_tts_wav(exp_narr, exp_wav_path, rate="+20%")

    outro_path = temp_dir / "outro.wav"
    generate_tts_wav("How many did you get right? Comment your score below!", outro_path, rate="+20%")

    concat_txt_path = temp_dir / "concat.txt"
    with open(concat_txt_path, "w", encoding="utf-8") as f:
        def p(path):
            return str(path.resolve()).replace("\\", "/")
        f.write(f"file '{p(hook_path)}'\n")
        f.write(f"file '{p(silence1_path)}'\n")
        for idx in range(len(questions)):
            num = idx + 1
            f.write(f"file '{p(temp_dir / f'q{num}.wav')}'\n")
            f.write(f"file '{p(silence2_path)}'\n")
            f.write(f"file '{p(temp_dir / f'a{num}.wav')}'\n")
            exp_wav_path = temp_dir / f"exp{num}.wav"
            if exp_wav_path.exists() and exp_wav_path.stat().st_size > 100:
                f.write(f"file '{p(silence1_path)}'\n")
                f.write(f"file '{p(exp_wav_path)}'\n")
            f.write(f"file '{p(silence1_path)}'\n")
        f.write(f"file '{p(outro_path)}'\n")

    _run([ffmpeg_exe, "-f", "concat", "-safe", "0", "-i", str(concat_txt_path), "-c", "copy", "-y", str(out_audio)])
    print("[STEP 2] Audio complete")
    timings["step2_audio_sec"] = time.time() - step2_start

    def get_wav_duration(path):
        with wave.open(str(path), 'rb') as f:
            return f.getnframes() / float(f.getframerate())

    events = []
    t = 0.0

    hook_dur = get_wav_duration(hook_path)
    events.append({
        "type": "hook",
        "start": t,
        "end": t + hook_dur,
        "text": quiz_data.get("hook", "")
    })
    t += hook_dur
    t += 0.3

    for idx, q in enumerate(questions):
        num = idx + 1
        q_path = temp_dir / f"q{num}.wav"
        a_path = temp_dir / f"a{num}.wav"
        exp_path = temp_dir / f"exp{num}.wav"

        q_dur = get_wav_duration(q_path)
        a_dur = get_wav_duration(a_path)
        exp_dur = get_wav_duration(exp_path) if exp_path.exists() else 0.0

        q_start = t
        q_end = t + q_dur
        think_start = q_end
        think_end = think_start + 1.0
        a_start = think_end
        a_end = a_start + a_dur

        events.append({
            "type": "question",
            "q_num": num,
            "start": q_start,
            "end": q_end,
            "question": q["question"],
            "options": q["options"],
            "answer": q["answer"],
            "difficulty": q["difficulty"]
        })
        events.append({
            "type": "think",
            "q_num": num,
            "start": think_start,
            "end": think_end,
            "question": q["question"],
            "options": q["options"],
            "answer": q["answer"],
            "difficulty": q["difficulty"]
        })
        
        if exp_dur > 0:
            exp_start = a_end + 0.3
            exp_end = exp_start + exp_dur
            events.append({
                "type": "answer",
                "q_num": num,
                "start": a_start,
                "end": a_end,
                "question": q["question"],
                "options": q["options"],
                "answer": q["answer"],
                "difficulty": q["difficulty"]
            })
            events.append({
                "type": "explanation",
                "q_num": num,
                "start": exp_start,
                "end": exp_end,
                "question": q["question"],
                "options": q["options"],
                "answer": q["answer"],
                "explanation": q.get("explanation", ""),
                "difficulty": q["difficulty"]
            })
            t = exp_end + 0.3
        else:
            events.append({
                "type": "answer",
                "q_num": num,
                "start": a_start,
                "end": a_end,
                "question": q["question"],
                "options": q["options"],
                "answer": q["answer"],
                "difficulty": q["difficulty"]
            })
            t = a_end + 0.3

    outro_dur = get_wav_duration(outro_path)
    events.append({
        "type": "outro",
        "start": t,
        "end": t + outro_dur,
        "text": "How many did you get right? Comment your score below!"
    })
    t += outro_dur
    total_duration = t

    # 4. Generate subtitles.srt
    step3_start = time.time()
    def fmt_srt_time(seconds):
        hh = int(seconds // 3600)
        mm = int((seconds % 3600) // 60)
        ss = int(seconds % 60)
        ms = int(round((seconds - int(seconds)) * 1000))
        if ms > 999: ms = 999
        return f"{hh:02d}:{mm:02d}:{ss:02d},{ms:03d}"

    with open(out_srt, "w", encoding="utf-8") as f:
        f.write("1\n")
        f.write(f"{fmt_srt_time(0.0)} --> {fmt_srt_time(hook_dur)}\n")
        f.write(f"{quiz_data.get('hook', '')}\n\n")

        srt_idx = 2
        for idx, q in enumerate(questions):
            num = idx + 1
            q_ev = [e for e in events if e["type"] == "question" and e["q_num"] == num][0]
            f.write(f"{srt_idx}\n")
            f.write(f"{fmt_srt_time(q_ev['start'])} --> {fmt_srt_time(q_ev['end'])}\n")
            f.write(f"Question {num}. {q['question']}\n\n")
            srt_idx += 1

            a_ev = [e for e in events if e["type"] == "answer" and e["q_num"] == num][0]
            f.write(f"{srt_idx}\n")
            f.write(f"{fmt_srt_time(a_ev['start'])} --> {fmt_srt_time(a_ev['end'])}\n")
            f.write(f"The correct answer is {q['answer']}.\n\n")
            srt_idx += 1

            exp_evs = [e for e in events if e["type"] == "explanation" and e["q_num"] == num]
            if exp_evs:
                exp_ev = exp_evs[0]
                f.write(f"{srt_idx}\n")
                f.write(f"{fmt_srt_time(exp_ev['start'])} --> {fmt_srt_time(exp_ev['end'])}\n")
                f.write(f"{exp_ev['explanation']}\n\n")
                srt_idx += 1

        outro_ev = [e for e in events if e["type"] == "outro"][0]
        f.write(f"{srt_idx}\n")
        f.write(f"{fmt_srt_time(outro_ev['start'])} --> {fmt_srt_time(outro_ev['end'])}\n")
        f.write("How many did you get right? Comment your score below!\n\n")

    print("[STEP 3] Subtitles complete")
    timings["step3_subtitles_sec"] = time.time() - step3_start

    # 5. Compile Video
    step4_start = time.time()
    target_w, target_h = 540, 960

    font_hook = get_font("arial.ttf", 32)
    font_small = get_font("arial.ttf", 26)
    font_large = get_font("arial.ttf", 24)
    font_opt = get_font("arial.ttf", 20)
    font_opt_bold = get_font("arial.ttf", 20)
    try:
        font_opt_bold = ImageFont.truetype("arialbd.ttf", 20)
    except Exception:
        pass

    def draw_wrapped_text(draw, text, font, fill_color, max_width, y_center):
        words = text.split()
        lines = []
        current_line = []
        for word in words:
            test_line = " ".join(current_line + [word])
            w = draw.textlength(test_line, font=font)
            if w < max_width:
                current_line.append(word)
            else:
                if current_line:
                    lines.append(" ".join(current_line))
                current_line = [word]
        if current_line:
            lines.append(" ".join(current_line))

        bbox = draw.textbbox((0, 0), "Hg", font=font)
        line_height = bbox[3] - bbox[1] + 12
        total_height = len(lines) * line_height
        y_start = y_center - (total_height / 2)

        for idx, line in enumerate(lines):
            y = y_start + idx * line_height
            draw.text((target_w / 2, y), line, font=font, fill=fill_color, stroke_width=2, stroke_fill=(0, 0, 0), anchor="mm")

    def draw_option_card(draw, text, y_pos, font, fill_color, border_color=(80, 80, 80), opacity=1.0, glow=False):
        card_w = target_w * 0.85
        card_h = 64
        x1 = (target_w - card_w) / 2
        y1 = y_pos - card_h / 2
        x2 = x1 + card_w
        y2 = y1 + card_h

        alpha = int(255 * opacity)

        if glow:
            for stroke in range(1, 6):
                glow_alpha = int((80 / stroke) * opacity)
                draw.rounded_rectangle([x1 - stroke, y1 - stroke, x2 + stroke, y2 + stroke], radius=10, outline=(46, 204, 113, glow_alpha), width=1)

        bg_color = (25, 25, 25, alpha) if not glow else (46, 204, 113, int(40 * opacity))
        draw.rounded_rectangle([x1, y1, x2, y2], radius=10, fill=bg_color, outline=border_color + (alpha,), width=2)
        draw.text((target_w / 2, y_pos), text, font=font, fill=fill_color + (alpha,), stroke_width=1, stroke_fill=(0, 0, 0, alpha), anchor="mm")

    bg_img = Image.open(str(bg_path)).convert("RGBA").resize((target_w, target_h))

    def make_frame(t):
        frame_img = bg_img.copy()
        draw = ImageDraw.Draw(frame_img, "RGBA")

        active_event = None
        for ev in events:
            if ev["start"] <= t <= ev["end"]:
                active_event = ev
                break
        if not active_event:
            active_event = events[0]
            for ev in events:
                if ev["start"] <= t:
                    active_event = ev
                else:
                    break

        if active_event["type"] == "hook":
            draw_wrapped_text(draw, active_event["text"], font_hook, (255, 255, 255), target_w * 0.85, target_h * 0.5)
        elif active_event["type"] == "outro":
            draw_wrapped_text(draw, "How many did you get right?", font_hook, (255, 255, 255), target_w * 0.85, target_h * 0.42)
            draw_wrapped_text(draw, "Comment your score below!", font_hook, (255, 223, 0), target_w * 0.85, target_h * 0.58)
        elif active_event["type"] == "explanation":
            q_num = active_event["q_num"]
            diff_str = active_event['difficulty'].upper()

            card_w = target_w * 0.85
            card_h = 56
            x1 = (target_w - card_w) / 2
            y1 = 40
            x2 = x1 + card_w
            y2 = y1 + card_h
            
            draw.rounded_rectangle([x1, y1, x2, y2], radius=8, fill=(15, 15, 15, 180), outline=(80, 80, 80, 180), width=1)
            
            q_label = f"Question {q_num}/10 ({diff_str})"
            draw.text((x1 + 16, y1 + card_h / 2), q_label, font=font_small, fill=(240, 240, 240), stroke_width=1, stroke_fill=(0, 0, 0), anchor="lm")
            
            score_label = "Can You Reach 10/10?"
            draw.text((x2 - 16, y1 + card_h / 2), score_label, font=font_small, fill=(255, 223, 0), stroke_width=1, stroke_fill=(0, 0, 0), anchor="rm")

            draw_wrapped_text(draw, active_event["question"], font_large, (255, 255, 255), target_w * 0.85, target_h * 0.32)

            options = active_event["options"]
            correct_answer = active_event["answer"]
            correct_idx = -1
            for idx, opt in enumerate(options):
                if opt.strip() == correct_answer.strip():
                    correct_idx = idx
                    break
            
            opt_labels = ["A", "B", "C"]
            label_text = f"{opt_labels[correct_idx]}. {correct_answer}" if correct_idx != -1 else correct_answer
            draw_option_card(draw, label_text, target_h * 0.54, font_opt_bold, (46, 204, 113), border_color=(46, 204, 113), glow=True)

            exp_w = target_w * 0.85
            exp_h = 160
            ex1 = (target_w - exp_w) / 2
            ey1 = target_h * 0.74 - exp_h / 2
            ex2 = ex1 + exp_w
            ey2 = ey1 + exp_h

            draw.rounded_rectangle([ex1, ey1, ex2, ey2], radius=12, fill=(20, 20, 20, 220), outline=(255, 223, 0, 200), width=2)
            draw.text((target_w / 2, ey1 + 25), "EXPLANATION / DID YOU KNOW?", font=font_small, fill=(255, 223, 0), stroke_width=1, stroke_fill=(0, 0, 0), anchor="mm")
            draw_wrapped_text(draw, active_event["explanation"], font_opt, (240, 240, 240), exp_w * 0.9, ey1 + 95)
        else:
            q_num = active_event["q_num"]
            diff_str = active_event['difficulty'].upper()

            card_w = target_w * 0.85
            card_h = 56
            x1 = (target_w - card_w) / 2
            y1 = 40
            x2 = x1 + card_w
            y2 = y1 + card_h
            
            draw.rounded_rectangle([x1, y1, x2, y2], radius=8, fill=(15, 15, 15, 180), outline=(80, 80, 80, 180), width=1)
            
            q_label = f"Question {q_num}/10 ({diff_str})"
            draw.text((x1 + 16, y1 + card_h / 2), q_label, font=font_small, fill=(240, 240, 240), stroke_width=1, stroke_fill=(0, 0, 0), anchor="lm")
            
            score_label = "Can You Reach 10/10?"
            draw.text((x2 - 16, y1 + card_h / 2), score_label, font=font_small, fill=(255, 223, 0), stroke_width=1, stroke_fill=(0, 0, 0), anchor="rm")

            draw_wrapped_text(draw, active_event["question"], font_large, (255, 255, 255), target_w * 0.85, target_h * 0.35)

            options = active_event["options"]
            correct_answer = active_event["answer"]

            correct_idx = -1
            for idx, opt in enumerate(options):
                if opt.strip() == correct_answer.strip():
                    correct_idx = idx
                    break

            opt_y_starts = [target_h * 0.65, target_h * 0.74, target_h * 0.83]
            opt_labels = ["A", "B", "C"]

            if active_event["type"] == "question":
                for idx, opt in enumerate(options):
                    draw_option_card(draw, f"{opt_labels[idx]}. {opt}", opt_y_starts[idx], font_opt, (255, 255, 255))
            elif active_event["type"] == "think":
                elapsed = t - active_event["start"]
                duration = active_event["end"] - active_event["start"]

                for idx, opt in enumerate(options):
                    draw_option_card(draw, f"{opt_labels[idx]}. {opt}", opt_y_starts[idx], font_opt, (255, 255, 255))

                progress_w = target_w * 0.5
                progress_h = 12
                px1 = (target_w - progress_w) / 2
                py1 = target_h * 0.51 - progress_h / 2
                px2 = px1 + progress_w
                py2 = py1 + progress_h

                draw.rounded_rectangle([px1, py1, px2, py2], radius=6, fill=(30, 30, 30, 200), outline=(80, 80, 80, 200), width=1)

                ratio = max(0.0, min(1.0, 1.0 - (elapsed / duration)))
                if ratio > 0:
                    draw.rounded_rectangle([px1 + 1, py1 + 1, px1 + 1 + (progress_w - 2) * ratio, py2 - 1], radius=5, fill=(255, 223, 0))
            elif active_event["type"] == "answer":
                for idx, opt in enumerate(options):
                    if idx == correct_idx:
                        draw_option_card(draw, f"{opt_labels[idx]}. {opt}", opt_y_starts[idx], font_opt_bold, (46, 204, 113), border_color=(46, 204, 113), glow=True)
                    else:
                        draw_option_card(draw, f"{opt_labels[idx]}. {opt}", opt_y_starts[idx], font_opt, (150, 150, 150), border_color=(50, 50, 50), opacity=0.3)

        return np.array(frame_img.convert("RGB"))

    thumb_frame_np = make_frame(0.2)
    Image.fromarray(thumb_frame_np).save(str(out_thumbnail))

    import os
    threads = os.cpu_count() or 4
    temp_video = out_final.with_suffix(".temp_v.mp4")

    # Render video track without heavy audio array processing in MoviePy
    video = VideoClip(frame_function=make_frame, duration=total_duration)
    video.write_videofile(
        str(temp_video),
        fps=18,
        codec="libx264",
        audio=False,
        threads=threads,
        preset="ultrafast",
        logger=None,
    )

    # Mux video and mono WAV audio using a raw FFmpeg stream copy command
    print(f"[FFmpeg] Muxing video and audio to: {out_final}")
    _run([
        ffmpeg_exe,
        "-i", str(temp_video),
        "-i", str(out_audio),
        "-c:v", "copy",
        "-c:a", "aac",
        "-y",
        str(out_final)
    ])

    try:
        temp_video.unlink()
    except Exception:
        pass
    print("[STEP 4] final.mp4 complete")
    timings["step4_render_sec"] = time.time() - step4_start

    try:
        shutil.rmtree(str(temp_dir), ignore_errors=True)
    except Exception:
        pass

    return {
        "subtitleOverlay": "WORKING",
        "renderProfile": "FAST_QUIZ",
        "fps": 18,
        "resolution": "540x960",
        "videoDuration": total_duration,
    }


def main() -> None:
    start_time = time.time()

    parser = argparse.ArgumentParser(
        description="Hybrid short generator: images + voice + captions -> final.mp4"
    )

    parser.add_argument("jobJsonPath", type=str, help="Path to job JSON")
    args = parser.parse_args()

    job_path = Path(args.jobJsonPath)
    job = json.loads(job_path.read_text(encoding="utf-8"))

    topic = str(job.get("topic", ""))
    script = str(job.get("script", ""))
    scenes = job.get("scenes", [])
    job_id = str(job.get("jobId") or job_path.stem)

    # Update status to processing in Firestore
    try:
        _init_firebase()
        from firebase_admin import firestore
        db = firestore.client()
        db.collection("videos").document(job_id).set({"status": "processing"}, merge=True)
        print(f"[Firebase] Marked job {job_id} as processing.")
    except Exception as e:
        print(f"[Firebase] Warning: Failed to set processing status: {e}")

    script_parent = Path(__file__).resolve().parent
    engine_root = script_parent.parent
    if "vps-rendering-engine" in str(script_parent.resolve()):
        out_dir = job_path.parent.parent / job_id
    else:
        out_dir = job_path.parent.parent / "local-ai" / "output" / job_id

    images_dir = out_dir / "images"
    out_audio = out_dir / "audio.wav"
    out_srt = out_dir / "subtitles.srt"
    out_final = out_dir / "final.mp4"
    out_thumbnail = out_dir / "thumbnail.png"

    contentType = job.get("contentType", "MOTIVATIONAL")
    if contentType == "QUIZ_SHORTS":
        timings = {
            "step1_images_sec": 0.0,
            "step2_audio_sec": 0.0,
            "step3_subtitles_sec": 0.0,
            "step4_render_sec": 0.0,
        }
        try:
            result = run_quiz_shorts(job, out_dir, out_audio, out_srt, out_final, out_thumbnail, timings)
            _finalize_render_and_upload(
                job_id=job_id,
                out_dir=out_dir,
                out_final=out_final,
                out_thumbnail=out_thumbnail,
                out_srt=out_srt,
                timings=timings,
                subtitle_meta={
                    "subtitleOverlay": result["subtitleOverlay"],
                    "renderProfile": result["renderProfile"],
                    "fps": result["fps"],
                    "resolution": result["resolution"],
                },
                probe={"playable": True, "audioDetected": True, "duration": result["videoDuration"]},
                cache_hits=0,
                cache_misses=0,
                is_quiz=True,
                video_duration=result["videoDuration"],
                start_time=start_time
            )
            return
        except Exception as e:
            print(f"[ERROR][QUIZ] Quiz rendering failed: {e}")
            try:
                _init_firebase()
                from firebase_admin import firestore
                db = firestore.client()
                db.collection("videos").document(job_id).set({"status": "failed", "error": str(e)}, merge=True)
            except Exception:
                pass
            raise

    scenes_list = scenes if isinstance(scenes, list) else []
    if not scenes_list:
        scenes_list = [{"text": "Scene 1"}, {"text": "Scene 2"}]

    image_paths: list[Path] = []
    thumbnail_scene_index = 1
    try:
        if isinstance(scenes_list, list) and len(scenes_list) > 0:
            maybe_best = None
            for sc_i, sc in enumerate(scenes_list, start=1):
                if isinstance(sc, dict) and sc.get("bestScene"):
                    maybe_best = sc_i
                    break
            if isinstance(maybe_best, int) and maybe_best >= 1:
                thumbnail_scene_index = maybe_best
    except Exception:
        thumbnail_scene_index = 1

    timings = {
        "step1_images_sec": None,
        "step2_audio_sec": None,
        "step3_subtitles_sec": None,
        "step4_render_sec": None,
    }
    
    step1_start = time.time()
    try:
        print("[STEP 1] Generating images...")
        for i, sc in enumerate(scenes_list, start=1):
            sc_text = ""
            if isinstance(sc, dict):
                sc_text = sc.get("text") or sc.get("contactText") or sc.get("imagePrompt") or ""

            title = sc_text.strip() or (f"{topic} - Scene {i}" if topic else f"Scene {i}")
            out_png = images_dir / f"scene{i}.png"

            try:
                scene_image_prompt = ""
                if isinstance(sc, dict):
                    scene_image_prompt = sc.get("imagePrompt") or sc.get("image_prompt") or ""

                prompt = _build_flux_scene_prompt(
                    topic=topic,
                    scene_text=sc_text,
                    scene_image_prompt=scene_image_prompt,
                    style=str(job.get("style", "")),
                    i=i,
                )

                _generate_or_load_cached_image(
                    prompt,
                    out_png=out_png,
                    width=1024,
                    height=1024,
                    steps=4,
                )
                _preprocess_resize_image(out_png, 1080, 1920)
            except Exception as e:
                print(f"[STEP 1][IMAGE] FLUX failed for scene {i}: {e}")
                _write_placeholder_image(out_png, title)
                _preprocess_resize_image(out_png, 1080, 1920)

            image_paths.append(out_png)

        print("[STEP 1] Images complete")
    except Exception as e:
        print(f"[ERROR][STEP 1] {e}")
        raise
    finally:
        timings["step1_images_sec"] = _log_step_time(1, step1_start)

    tts_text = script.strip()
    if not tts_text:
        tts_text = (
            " ".join(
                [
                    (s.get("text") or s.get("contactText") or "").strip()
                    for s in scenes_list
                    if isinstance(s, dict)
                ]
            ).strip()
            or topic
        )

    if not tts_text:
        raise RuntimeError("Job JSON missing script/topic; cannot generate narration.")

    step2_start = time.time()
    try:
        _edge_tts(tts_text, out_audio)
        print("[STEP 2] Audio complete")
    except Exception as e:
        print(f"[ERROR][STEP 2] {e}")
        raise
    finally:
        timings["step2_audio_sec"] = _log_step_time(2, step2_start)

    step3_start = time.time()
    try:
        _transcribe_to_srt(out_audio, out_srt)
        print("[STEP 3] Subtitles complete")
    except Exception as e:
        print(f"[ERROR][STEP 3] {e}")
        raise
    finally:
        timings["step3_subtitles_sec"] = _log_step_time(3, step3_start)

    thumbnail_scene_img = None
    try:
        idx0 = max(0, min(len(image_paths) - 1, thumbnail_scene_index - 1))
        thumbnail_scene_img = image_paths[idx0]
    except Exception:
        thumbnail_scene_img = image_paths[0] if image_paths else None

    out_thumbnail = out_dir / "thumbnail.png"
    try:
        if thumbnail_scene_img and thumbnail_scene_img.exists():
            shutil.copyfile(str(thumbnail_scene_img), str(out_thumbnail))
        else:
            _write_placeholder_image(out_thumbnail, "Thumbnail")
    except Exception as e:
        print(f"[WARN][THUMBNAIL] Failed to write thumbnail.png: {e}")
        try:
            _write_placeholder_image(out_thumbnail, "Thumbnail")
        except Exception:
            pass

    step4_start = time.time()
    subtitle_meta = {"subtitleOverlay": "FALLBACK"}
    try:
        subtitle_meta = _assemble_video(
            job_id,
            job.get("renderProfile") or "STANDARD_SHORTS",
            image_paths,
            out_audio,
            out_srt,
            out_final,
        )
        print("[STEP 4] final.mp4 complete")
    except Exception as e:
        print(f"[ERROR][STEP 4] {e}")
        raise
    finally:
        timings["step4_render_sec"] = _log_step_time(4, step4_start)

    if not out_final.exists() or out_final.stat().st_size < 1024:
        raise RuntimeError(f"Movie render produced no valid final.mp4: {out_final}")

    probe = _probe_with_ffprobe(out_final)

    _finalize_render_and_upload(
        job_id=job_id,
        out_dir=out_dir,
        out_final=out_final,
        out_thumbnail=out_thumbnail,
        out_srt=out_srt,
        timings=timings,
        subtitle_meta=subtitle_meta,
        probe=probe,
        cache_hits=cache.get("hits", 0),
        cache_misses=cache.get("misses", 0),
        is_quiz=False,
        video_duration=probe.get("duration", None),
        start_time=start_time
    )


if __name__ == "__main__":
    main()
