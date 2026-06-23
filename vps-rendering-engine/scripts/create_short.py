import json
import argparse
import subprocess
import os
import time
import shutil
from pathlib import Path

# Load .env from render engine root (for standalone execution)
try:
    from dotenv import load_dotenv as _load_dotenv
    _env_file = Path(__file__).resolve().parent.parent / ".env"
    if _env_file.exists():
        _load_dotenv(dotenv_path=_env_file)
except ImportError:
    pass

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
    country: str = "default",
    video_url: str | None = None,
) -> None:
    total_execution_seconds = int(time.time() - start_time)
    video_size_mb = 0.0
    if out_final.exists():
        video_size_mb = round(os.path.getsize(out_final) / (1024 * 1024), 2)
        
    _init_firebase()
    
    thumbnail_url = None
    subtitles_url = None
    cloudinary_public_id = None
    cloudinary_thumb_id = None
    cloudinary_srt_id = None

    country_folder = country.lower().strip().replace(" ", "_")
    folder_path = f"ai_shorts/quizzes/{country_folder}/{job_id}" if is_quiz else f"ai_shorts/{job_id}"
    
    try:
        if not video_url:
            print(f"[Cloudinary] Uploading {out_final} as video to {folder_path}...")
            video_upload = cloudinary.uploader.upload(
                str(out_final),
                resource_type="video",
                folder=folder_path,
                overwrite=True
            )
            video_url = video_upload.get("secure_url")
            cloudinary_public_id = video_upload.get("public_id")
            print(f"[Cloudinary] Video uploaded. URL: {video_url}, Public ID: {cloudinary_public_id}")
        else:
            cloudinary_public_id = f"{folder_path}/final"
            print(f"[Cloudinary] Using pre-streamed Video URL: {video_url}")
        
        if out_thumbnail.exists():
            print(f"[Cloudinary] Uploading {out_thumbnail} as image to {folder_path}...")
            thumb_upload = cloudinary.uploader.upload(
                str(out_thumbnail),
                resource_type="image",
                folder=folder_path,
                overwrite=True
            )
            thumbnail_url = thumb_upload.get("secure_url")
            cloudinary_thumb_id = thumb_upload.get("public_id")
            print(f"[Cloudinary] Thumbnail uploaded. URL: {thumbnail_url}, Public ID: {cloudinary_thumb_id}")
            
        if out_srt.exists():
            print(f"[Cloudinary] Uploading {out_srt} as raw file to {folder_path}...")
            srt_upload = cloudinary.uploader.upload(
                str(out_srt),
                resource_type="raw",
                folder=folder_path,
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
            "resolution": subtitle_meta.get("resolution", "1080x1920" if is_quiz else "720x1280"),
            "timings": timings,
            "cache": {"hits": cache_hits, "misses": cache_misses},
            "playable": probe.get("playable", True),
            "audioDetected": probe.get("audioDetected", True),
            "videoDuration": dur,
        }
        print(f"[Firebase] Updating Firestore document {job_id}...")
        doc_ref.set(update_payload, merge=True)
        print("[Firebase] Firestore update complete.")

        # Write local result.json for main.py to read completion metadata
        result_payload = {
            "jobId": job_id,
            "status": "completed",
            "videoUrl": video_url,
            "thumbnailUrl": thumbnail_url,
            "subtitlesUrl": subtitles_url,
            "renderProfile": subtitle_meta.get("renderProfile", "STANDARD_SHORTS"),
            "fps": subtitle_meta.get("fps", 24),
            "resolution": subtitle_meta.get("resolution", "720x1280"),
            "timings": timings,
            "cache": {"hits": cache_hits, "misses": cache_misses},
        }
        result_json_path = out_dir / "result.json"
        try:
            result_json_path.write_text(json.dumps(result_payload, ensure_ascii=False, indent=2), encoding="utf-8")
            print(f"[Worker] Wrote completion metadata to {result_json_path}")
        except Exception as json_err:
            print(f"[Worker] Warning: Failed to write result.json: {json_err}")
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
    for local_file in [out_final, out_thumbnail, out_srt, out_dir / "audio.wav"]:
        if local_file.exists():
            try:
                local_file.unlink()
            except Exception:
                pass

def _run(cmd: list[str], *, cwd: Path | None = None) -> None:
    print("Running:", " ".join(cmd))
    subprocess.run(cmd, check=True, cwd=str(cwd) if cwd else None)


def _edge_tts(text: str, out_wav: Path, voice: str = "en-US-ChristopherNeural", rate: str | None = None) -> None:
    """Generates high-quality neural TTS audio from text using edge-tts library asynchronously.
    Bypasses external GPU requirements entirely.
    """
    import asyncio
    import edge_tts
    import time as _sleep
    import uuid

    out_wav.parent.mkdir(parents=True, exist_ok=True)

    # Resolve shared memory path for temporary MP3 synthesis to prevent disk write
    shm_dir = Path("/dev/shm")
    if not shm_dir.exists():
        shm_dir = out_wav.parent / "temp"
    shm_dir.mkdir(parents=True, exist_ok=True)
    temp_audio = shm_dir / f"temp_audio_{uuid.uuid4().hex}.mp3"

    async def _async_compile():
        r = rate if rate else "+0%"
        communicate = edge_tts.Communicate(text, voice, rate=r)
        await communicate.save(str(temp_audio))

    try:
        max_retries = 3
        for attempt in range(max_retries):
            try:
                asyncio.run(_async_compile())
                break
            except Exception as e:
                if attempt == max_retries - 1:
                    print(f"[EDGE-TTS] Failed after {max_retries} attempts: {e}")
                    raise
                sleep_time = 2 ** attempt
                print(f"[EDGE-TTS] Attempt {attempt + 1} failed. Retrying in {sleep_time}s... Error: {e}")
                _sleep.sleep(sleep_time)

        if not temp_audio.exists():
            raise RuntimeError(f"[STEP 2] edge-tts temp output {temp_audio} does not exist.")

        temp_size = temp_audio.stat().st_size
        print(f"[AUDIO] temp readable: {temp_audio.as_posix()} (size={temp_size})")

        minimal_threshold = 256  # bytes
        if temp_size < minimal_threshold:
            raise RuntimeError(
                f"[STEP 2] Invalid temp audio size={temp_size} bytes (<{minimal_threshold})."
            )

        # Copy bytes into final contract file
        with open(temp_audio, "rb") as src:
            with open(out_wav, "wb") as dst:
                dst.write(src.read())
                dst.flush()
                os.fsync(dst.fileno())

        # Optional stabilization.
        _sleep.sleep(0.75)

        if not out_wav.exists():
            raise RuntimeError(f"[STEP 2] audio.wav copy failed: {out_wav} does not exist")

        out_size = out_wav.stat().st_size
        print(f"[AUDIO] copy success -> audio.wav: {out_wav.as_posix()} (size={out_size})")
        if out_size < minimal_threshold:
            raise RuntimeError(
                f"[STEP 2] audio.wav invalid size={out_size} bytes (<{minimal_threshold})"
            )
    finally:
        # Cleanup temp file from shared memory / temp directory
        if temp_audio.exists():
            try:
                temp_audio.unlink()
                print(f"[Cleanup] Cleaned up edge-tts temp file: {temp_audio}")
            except Exception as clean_err:
                print(f"[Cleanup] Error unlinking temp file {temp_audio}: {clean_err}")



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
    # Resolve profile
    RENDER_PROFILES = {
        "FAST_PREVIEW": {"fps": 18, "width": 540, "height": 960},
        "LOW_MEMORY": {"fps": 18, "width": 540, "height": 960},
        "STANDARD_SHORTS": {"fps": 24, "width": 720, "height": 1280},
        "STANDARD": {"fps": 24, "width": 720, "height": 1280},
        "HIGH_QUALITY": {"fps": 30, "width": 1080, "height": 1920},
    }
    profile_key = str(render_profile or "STANDARD_SHORTS").strip() or "STANDARD_SHORTS"
    profile = RENDER_PROFILES.get(profile_key, RENDER_PROFILES["STANDARD_SHORTS"])
    
    total_duration = _load_total_duration_from_srt(subtitles_srt)
    
    # Pre-resize images to target width/height
    target_w, target_h = int(profile["width"]), int(profile["height"])
    for img in images:
        _preprocess_resize_image(img, target_w, target_h)
        
    ffmpeg_exe = os.environ.get("IMAGEIO_FFMPEG_EXE", "ffmpeg")
    
    # Construct slideshow inputs
    n = max(1, len(images))
    per = total_duration / n
    
    cmd = [ffmpeg_exe, "-y"]
    filter_concat = ""
    for idx, img in enumerate(images):
        cmd.extend(["-loop", "1", "-t", f"{per:.3f}", "-i", str(img)])
        filter_concat += f"[{idx}:v]"
        
    # Add audio input
    audio_idx = len(images)
    cmd.extend(["-i", str(audio_wav)])
    
    # Escape subtitles path
    sub_path_escaped = str(subtitles_srt.resolve()).replace("\\", "/").replace(":", "\\:").replace("'", "'\\''")
    
    # Build filter complex
    if len(images) > 1:
        filter_concat += f"concat=n={len(images)}:v=1:a=0[v_slideshow];"
        sub_input = "[v_slideshow]"
    else:
        sub_input = "[0:v]"
        
    filter_complex = f"{filter_concat}{sub_input}subtitles='{sub_path_escaped}':force_style='FontSize=16'[v_final]"
    
    cmd.extend([
        "-filter_complex", filter_complex,
        "-map", "[v_final]",
        "-map", f"{audio_idx}:a",
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-r", str(profile["fps"]),
        "-c:a", "aac",
        "-y",
        str(out_mp4)
    ])
    
    print("Running FFmpeg assemble:", " ".join(cmd))
    subprocess.run(cmd, check=True)
    
    return {
        "subtitleOverlay": "WORKING",
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


def _process_flag_background(flag_url: str, out_path: Path) -> bool:
    import requests
    from PIL import Image, ImageFilter, ImageEnhance
    temp_flag = out_path.parent / "temp_flag_raw.png"
    try:
        print(f"[Pillow] Downloading flag image: {flag_url}")
        resp = requests.get(flag_url, timeout=30)
        if resp.status_code >= 300:
            print(f"[Pillow] Failed to download flag: HTTP {resp.status_code}")
            return False
        
        temp_flag.write_bytes(resp.content)
        
        with Image.open(temp_flag) as img:
            target_w, target_h = 1080, 1920
            img_w, img_h = img.size
            scale = max(target_w / img_w, target_h / img_h)
            new_w = int(img_w * scale)
            new_h = int(img_h * scale)
            img_resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
            
            x_offset = (new_w - target_w) // 2
            y_offset = (new_h - target_h) // 2
            img_cropped = img_resized.crop((x_offset, y_offset, x_offset + target_w, y_offset + target_h))
            
            img_blurred = img_cropped.filter(ImageFilter.GaussianBlur(radius=25))
            
            enhancer = ImageEnhance.Brightness(img_blurred)
            img_final = enhancer.enhance(0.7)
            
            img_final.convert("RGBA").save(out_path)
            print(f"[Pillow] Processed background flag saved to {out_path}")
        return True
    except Exception as e:
        print(f"[Pillow] Warning: Failed to process flag background: {e}")
        return False
    finally:
        if temp_flag.exists():
            try:
                temp_flag.unlink()
            except Exception:
                pass


async def _async_generate_tts_mp3(text: str, voice: str, rate: str, out_mp3: Path) -> None:
    """Generates a single TTS audio clip as an MP3 asynchronously.
    Includes network retry logic for robustness.
    """
    import edge_tts
    import asyncio
    
    r = rate if rate else "+0%"
    communicate = edge_tts.Communicate(text, voice, rate=r)
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            await communicate.save(str(out_mp3))
            
            # Verify file exists and is readable
            if out_mp3.exists() and out_mp3.stat().st_size >= 256:
                return
            raise RuntimeError(f"Generated MP3 file too small or empty: {out_mp3}")
        except Exception as e:
            if attempt == max_retries - 1:
                print(f"[EDGE-TTS] Failed concurrent generation of {out_mp3.name} after {max_retries} attempts: {e}")
                raise
            sleep_time = 2 ** attempt
            print(f"[EDGE-TTS] Attempt {attempt + 1} failed for {out_mp3.name}. Retrying in {sleep_time}s... Error: {e}")
            await asyncio.sleep(sleep_time)

def _ensure_audio_assets(engine_root: Path) -> dict:
    assets_dir = engine_root / "assets" / "audio"
    assets_dir.mkdir(parents=True, exist_ok=True)
    
    pop_wav = assets_dir / "pop.wav"
    ding_wav = assets_dir / "ding.wav"
    bgm_wav = assets_dir / "bgm.wav"
    
    ffmpeg_exe = os.environ.get("IMAGEIO_FFMPEG_EXE", "ffmpeg")
    
    if not pop_wav.exists():
        subprocess.run([ffmpeg_exe, "-y", "-f", "lavfi", "-i", "aevalsrc='sin(400*2*PI*t)*exp(-15*t)':d=0.15", str(pop_wav)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if not ding_wav.exists():
        subprocess.run([ffmpeg_exe, "-y", "-f", "lavfi", "-i", "aevalsrc='sin(800*2*PI*t)*exp(-4*t)+sin(1200*2*PI*t)*exp(-4*t)':d=0.8", str(ding_wav)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if not bgm_wav.exists():
        subprocess.run([ffmpeg_exe, "-y", "-f", "lavfi", "-i", "aevalsrc='sin(60*2*PI*t)*0.1':d=10", str(bgm_wav)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
    return {
        "pop": pop_wav,
        "ding": ding_wav,
        "bgm": bgm_wav
    }

def run_quiz_shorts(job: dict, out_dir: Path, out_audio: Path, out_srt: Path, out_final: Path, out_thumbnail: Path, timings: dict) -> dict:
    import wave
    import numpy as np
    from PIL import Image, ImageDraw, ImageFont
    import os
    import time
    import shutil
    import asyncio
    import subprocess
    import textwrap
    import uuid
    import cloudinary.uploader

    total_start = time.perf_counter()

    topic = str(job.get("topic", ""))
    quiz_data = job.get("quizData")
    if not quiz_data:
        quiz_data = {
            "hook": job.get("hook") or job.get("script") or "Let's test your knowledge.",
            "questions": job.get("questions", []),
            "title": job.get("title", ""),
            "description": job.get("description", ""),
            "hashtags": job.get("hashtags", []),
            "flagUrl": job.get("flagUrl"),
            "voiceCode": job.get("voiceCode"),
            "gradingScale": job.get("gradingScale"),
        }

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
    else:
        theme = "world_theme"

    temp_dir = out_dir / "temp"
    temp_dir.mkdir(parents=True, exist_ok=True)

    shm_root = Path("/dev/shm")
    if shm_root.exists() and os.name != "nt":
        shm_dir = shm_root
    else:
        shm_dir = temp_dir

    created_files = set()

    def get_audio_duration(path: Path) -> float:
        # Fast path: try mutagen header read (no subprocess, ~1ms)
        try:
            from mutagen.mp3 import MP3
            audio = MP3(str(path))
            dur = audio.info.length
            if dur and dur > 0.0:
                return dur
        except Exception:
            pass

        # Medium path: ffprobe
        ffprobe = shutil.which("ffprobe")
        if ffprobe:
            try:
                cmd = [
                    ffprobe,
                    "-v", "error",
                    "-show_entries", "format=duration",
                    "-of", "default=noprint_wrappers=1:nokey=1",
                    str(path)
                ]
                res = subprocess.run(cmd, capture_output=True, text=True, check=True)
                return float(res.stdout.strip())
            except Exception as e:
                print(f"[get_audio_duration] ffprobe check failed: {e}")

        # Fallback: convert MP3 to WAV using ffmpeg and read WAV duration
        ffmpeg_exe = os.environ.get("IMAGEIO_FFMPEG_EXE", "ffmpeg")
        import wave
        temp_wav = path.parent / f"temp_{path.stem}_dur.wav"
        try:
            cmd = [ffmpeg_exe, "-y", "-i", str(path), "-ac", "1", "-ar", "24000", str(temp_wav)]
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
            with wave.open(str(temp_wav), 'rb') as f:
                return f.getnframes() / float(f.getframerate())
        except Exception as e:
            print(f"[get_audio_duration] Fallback failed: {e}")
            return 5.0
        finally:
            if temp_wav.exists():
                try:
                    temp_wav.unlink()
                except Exception:
                    pass

    def escape_ffmpeg_text(text: str) -> str:
        t = text.replace('\\', '\\\\').replace("'", "'\\''").replace(':', '\\:').replace('%', '\\%')
        t = t.replace('\n', '\r')
        return t

    def get_ffmpeg_font() -> str:
        candidates = [
            "C:/Windows/Fonts/ariblk.ttf",
            "C:/Windows/Fonts/impact.ttf",
            "C:/Windows/Fonts/arial.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
            "arial.ttf",
            "Arial"
        ]
        for c in candidates:
            if Path(c).exists():
                return c
        return "Arial"

    try:
        ramdisk_start = time.perf_counter()
        flag_url = quiz_data.get("flagUrl")
        flag_bg_path = shm_dir / f"quiz_{job_id}_temp_bg.png"
        processed_flag = False
        if flag_url:
            processed_flag = _process_flag_background(flag_url, flag_bg_path)
            if processed_flag:
                created_files.add(flag_bg_path)

        if not processed_flag:
            script_parent = Path(__file__).resolve().parent
            engine_root = script_parent.parent
            if "vps-rendering-engine" in str(script_parent.resolve()):
                fallback_bg = engine_root / "assets" / "backgrounds" / f"{theme}.png"
                if not fallback_bg.exists():
                    fallback_bg = engine_root / "assets" / "backgrounds" / "world_theme.png"
            else:
                repo_root = script_parent.parent
                fallback_bg = repo_root / "hybrid-video" / "assets" / "backgrounds" / f"{theme}.png"
                if not fallback_bg.exists():
                    fallback_bg = repo_root / "hybrid-video" / "assets" / "backgrounds" / "world_theme.png"
            shutil.copyfile(str(fallback_bg), str(flag_bg_path))
            created_files.add(flag_bg_path)

        script_parent = Path(__file__).resolve().parent
        engine_root = script_parent.parent
        if "vps-rendering-engine" not in str(script_parent.resolve()):
            engine_root = script_parent.parent / "hybrid-video"
        audio_assets = _ensure_audio_assets(engine_root)

        print(f"[QUIZ] Selected background path: {flag_bg_path.as_posix()}")
        print(f"[PERF METRIC - RAMDISK]: Flag background Pillow processing completed in {time.perf_counter() - ramdisk_start:.2f} seconds.")

        tts_start = time.perf_counter()
        ffmpeg_exe = os.environ.get("IMAGEIO_FFMPEG_EXE", "ffmpeg")

        voice_code = quiz_data.get("voiceCode") or job.get("voiceCode") or "en-US-AriaNeural"
        country_lower = str(job.get("country", "")).lower()
        if not quiz_data.get("voiceCode") and not job.get("voiceCode"):
            if "united kingdom" in country_lower or "uk" in country_lower:
                voice_code = "en-GB-RyanNeural"
            elif "india" in country_lower:
                voice_code = "en-IN-PrabhatNeural"
            elif "japan" in country_lower:
                voice_code = "ja-JP-KeitaNeural"

        tts_requests = []
        hook_mp3 = shm_dir / f"quiz_{job_id}_hook.mp3"
        tts_requests.append({
            "text": quiz_data.get("hook", "Let's test your knowledge."),
            "mp3": hook_mp3,
            "rate": "+20%"
        })

        questions = quiz_data.get("questions", [])
        # Rapid mode: ≤8 questions → 2s think time, faster speech, no explanations
        is_rapid = len(questions) <= 8
        rapid_rate = "+35%" if is_rapid else "+25%"
        for idx, q in enumerate(questions):
            num = idx + 1
            q_mp3 = shm_dir / f"quiz_{job_id}_q{num}.mp3"
            a_mp3 = shm_dir / f"quiz_{job_id}_a{num}.mp3"
            exp_mp3 = shm_dir / f"quiz_{job_id}_exp{num}.mp3"

            q_narr = f"Question {num}. {q['question']}"
            a_narr = f"{q['answer']}" if "answer" in q else f"{q['options'][q['answerIndex']]}"
            exp_narr = q.get("explanation", "").strip() if not is_rapid else ""

            tts_requests.append({"text": q_narr, "mp3": q_mp3, "rate": rapid_rate})
            tts_requests.append({"text": a_narr, "mp3": a_mp3, "rate": "+25%"})
            if exp_narr:
                tts_requests.append({"text": exp_narr, "mp3": exp_mp3, "rate": "+20%"})

        outro_mp3 = shm_dir / f"quiz_{job_id}_outro.mp3"
        tts_requests.append({
            "text": "For more quizzes, subscribe and comment your score below!",
            "mp3": outro_mp3,
            "rate": "+20%"
        })

        async def run_concurrent_tts():
            tasks = []
            for req in tts_requests:
                created_files.add(req["mp3"])
                tasks.append(
                    asyncio.create_task(
                        _async_generate_tts_mp3(
                            text=req["text"],
                            voice=voice_code,
                            rate=req["rate"],
                            out_mp3=req["mp3"]
                        )
                    )
                )
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for res, req in zip(results, tts_requests):
                if isinstance(res, Exception):
                    raise RuntimeError(f"Concurrent TTS failed for segment text '{req['text']}': {res}")

        asyncio.run(run_concurrent_tts())
        print(f"[PERF METRIC - TTS]: Concurrency completed in {time.perf_counter() - tts_start:.2f} seconds.")

        t = 0.0
        hook_req = tts_requests[0]
        hook_req["start_time"] = t
        hook_req["duration"] = get_audio_duration(hook_req["mp3"])
        t += hook_req["duration"] + 0.1

        req_idx = 1
        pop_delays = []
        ding_delays = []
        
        for idx, q in enumerate(questions):
            q_req = tts_requests[req_idx]
            q_req["start_time"] = t
            q_req["duration"] = get_audio_duration(q_req["mp3"])
            t += q_req["duration"]
            req_idx += 1

            pop_delays.append(int(t * 1000))
            q["think_start"] = t
            q["think_duration"] = 2.0 if is_rapid else float(q.get("duration", 3.5))
            q["think_end"] = q["think_start"] + q["think_duration"]
            t = q["think_end"]
            ding_delays.append(int(t * 1000))

            a_req = tts_requests[req_idx]
            a_req["start_time"] = t
            a_req["duration"] = get_audio_duration(a_req["mp3"])
            t += a_req["duration"]
            req_idx += 1

            exp_narr = q.get("explanation", "").strip() if not is_rapid else ""
            if exp_narr:
                t += 0.1
                exp_req = tts_requests[req_idx]
                exp_req["start_time"] = t
                exp_req["duration"] = get_audio_duration(exp_req["mp3"])
                t += exp_req["duration"]
                req_idx += 1
            t += 0.1

        outro_req = tts_requests[req_idx]
        outro_req["start_time"] = t
        outro_req["duration"] = get_audio_duration(outro_req["mp3"])
        t += outro_req["duration"]
        total_duration = t

        # Write subtitles.srt (to upload later)
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
            f.write(f"{fmt_srt_time(0.0)} --> {fmt_srt_time(hook_req['duration'])}\n")
            f.write(f"{quiz_data.get('hook', '')}\n\n")

            srt_idx = 2
            req_idx = 1
            for idx, q in enumerate(questions):
                q_req = tts_requests[req_idx]
                f.write(f"{srt_idx}\n")
                q_end = q_req["start_time"] + q_req["duration"]
                f.write(f"{fmt_srt_time(q_req['start_time'])} --> {fmt_srt_time(q_end)}\n")
                f.write(f"Question {idx+1}. {q['question']}\n\n")
                srt_idx += 1
                req_idx += 1

                a_req = tts_requests[req_idx]
                f.write(f"{srt_idx}\n")
                a_end = a_req["start_time"] + a_req["duration"]
                f.write(f"{fmt_srt_time(a_req['start_time'])} --> {fmt_srt_time(a_end)}\n")
                f.write(f"The correct answer is {q['answer'] if 'answer' in q else q['options'][q['answerIndex']]}.\n\n")
                srt_idx += 1
                req_idx += 1

                exp_narr = q.get("explanation", "").strip() if not is_rapid else ""
                if exp_narr:
                    exp_req = tts_requests[req_idx]
                    f.write(f"{srt_idx}\n")
                    exp_end = exp_req["start_time"] + exp_req["duration"]
                    f.write(f"{fmt_srt_time(exp_req['start_time'])} --> {fmt_srt_time(exp_end)}\n")
                    f.write(f"{exp_narr}\n\n")
                    srt_idx += 1
                    req_idx += 1

            outro_req = tts_requests[req_idx]
            f.write(f"{srt_idx}\n")
            outro_end = outro_req["start_time"] + outro_req["duration"]
            f.write(f"{fmt_srt_time(outro_req['start_time'])} --> {fmt_srt_time(outro_end)}\n")
            f.write("For more quizzes, subscribe and comment your score below!\n\n")

        print("[STEP 3] Subtitles complete")
        timings["step3_subtitles_sec"] = time.time() - step3_start

        # 4. Generate thumbnail using Pillow on the background image
        try:
            shutil.copyfile(str(flag_bg_path), str(out_thumbnail))
            print(f"[Thumbnail] Generated thumbnail at {out_thumbnail}")
        except Exception as thumb_err:
            print(f"[Thumbnail] Warning: Failed to copy background as thumbnail: {thumb_err}")

        # 5. FFmpeg Filtergraph construction
        ffmpeg_start = time.perf_counter()

        filter_parts = []
        
        # Delay and label audio inputs
        # Add SFX and BGM to mix (Audio indices shifted by 1 because of flag_bg_path)
        for idx, req in enumerate(tts_requests):
            inp_idx = idx + 2
            delay_ms = int(req["start_time"] * 1000)
            filter_parts.append(f"[{inp_idx}:a]adelay={delay_ms}|{delay_ms}:all=1[a_delayed_{inp_idx}]")

        delayed_labels = "".join(f"[a_delayed_{i+2}]" for i in range(len(tts_requests)))
        
        pop_idx = len(tts_requests) + 2
        ding_idx = len(tts_requests) + 3
        bgm_idx = len(tts_requests) + 4
        
        num_q = len(questions)
        sfx_mix_labels = ""
        if num_q > 0:
            filter_parts.append(f"[{pop_idx}:a]asplit={num_q}" + "".join(f"[pop_split_{i}]" for i in range(num_q)))
            filter_parts.append(f"[{ding_idx}:a]asplit={num_q}" + "".join(f"[ding_split_{i}]" for i in range(num_q)))
            for i in range(num_q):
                filter_parts.append(f"[pop_split_{i}]adelay={pop_delays[i]}|{pop_delays[i]}:all=1[pop_d_{i}]")
                filter_parts.append(f"[ding_split_{i}]adelay={ding_delays[i]}|{ding_delays[i]}:all=1[ding_d_{i}]")
                sfx_mix_labels += f"[pop_d_{i}][ding_d_{i}]"

        filter_parts.append(f"[{bgm_idx}:a]volume=0.1[bgm_vol]")
        total_audio_inputs = len(tts_requests) + (num_q * 2) + 1
        filter_parts.append(f"{delayed_labels}{sfx_mix_labels}[bgm_vol]amix=inputs={total_audio_inputs}:duration=longest:dropout_transition=0[a_mixed]")
        
        # 5. Render frames to PNGs in memory via Pillow (extremely fast, avoids Windows Font file I/O bottleneck in FFmpeg)
        ffmpeg_start = time.perf_counter()
        fps = 18
        total_frames = int(total_duration * fps)
        
        frames_dir = temp_dir / "frames"
        frames_dir.mkdir(parents=True, exist_ok=True)
        
        from PIL import Image, ImageDraw, ImageFont
        import math
        
        # We no longer load the background into Pillow for Ken Burns.
        # It will be rendered dynamically inside FFmpeg.
            
        font_path = get_ffmpeg_font()
        font_hook = get_font(font_path, 54)
        font_header = get_font(font_path, 42)
        font_question = get_font(font_path, 48)
        font_cnt = get_font(font_path, 72)
        font_option = get_font(font_path, 36)
        font_exp = get_font(font_path, 32)
        
        outro_scale = job.get("gradingScale", quiz_data.get("gradingScale", "0/8: Tourist. 8/8: True Citizen."))
        font_outro_rank = get_font(font_path, 36)
        font_outro_l1 = get_font(font_path, 48)
        font_outro_l2 = get_font(font_path, 64)
        font_outro_l3 = get_font(font_path, 42)

        # Feature 6: Branding Presets — read dynamic config from job payload
        _brand_cfg = job.get("brandConfig") or {}
        _brand_text = str(_brand_cfg.get("watermarkText") or "").strip()
        _brand_pos = str(_brand_cfg.get("watermarkPosition") or "top_right").strip()
        _brand_primary = str(_brand_cfg.get("primaryColor") or "#6366f1").strip()
        # Convert primary hex to RGBA tuple for Pillow
        def _hex_to_rgba(hex_str: str, alpha: int = 180) -> tuple:
            hex_str = hex_str.lstrip("#")
            if len(hex_str) == 6:
                r, g, b = int(hex_str[0:2], 16), int(hex_str[2:4], 16), int(hex_str[4:6], 16)
                return (r, g, b, alpha)
            return (99, 102, 241, alpha)  # fallback indigo
        _brand_color_rgba = _hex_to_rgba(_brand_primary) if _brand_text else None
        _font_watermark = get_font(font_path, 28) if _brand_text else None
        print(f"[Brand] Watermark: '{_brand_text}' @ {_brand_pos} in color {_brand_primary}")
        
        # Draw high-retention text with thick borders and drop shadows
        def draw_shadowed_text(draw, position, text, font, fill, stroke_width=4, stroke_color="black"):
            x, y = position
            # Heavy drop shadow: black at 60% opacity (offset by +5, +5)
            draw.text((x + 5, y + 5), text, font=font, fill=(0, 0, 0, 153))
            # Bold main text with outline
            draw.text((x, y), text, font=font, fill=fill, stroke_width=stroke_width, stroke_fill=stroke_color)

        def draw_wrapped_text(draw, text, font, fill, center_x, center_y, max_width=30, line_spacing=10, stroke_width=4, stroke_color="black"):
            lines = textwrap.wrap(text, width=max_width)
            total_height = 0
            line_heights = []
            for line in lines:
                bbox = draw.textbbox((0, 0), line, font=font)
                w = bbox[2] - bbox[0]
                h = bbox[3] - bbox[1]
                line_heights.append((w, h))
                total_height += h
            total_height += line_spacing * (len(lines) - 1)
            
            curr_y = center_y - total_height / 2
            for i, line in enumerate(lines):
                w, h = line_heights[i]
                lx = center_x - w / 2
                # Heavy drop shadow
                draw.text((lx + 5, curr_y + 5), line, font=font, fill=(0, 0, 0, 153))
                # Bold main text
                draw.text((lx, curr_y), line, font=font, fill=fill, stroke_width=stroke_width, stroke_fill=stroke_color)
                curr_y += h + line_spacing

        print(f"[Pillow] Rendering {total_frames} frames asynchronously in memory...")
        render_frames_start = time.perf_counter()
        
        for f_idx in range(total_frames):
            t = f_idx / fps
            
            # Background handled by FFmpeg. Start with a purely transparent frame.
            frame_img = Image.new("RGBA", (1080, 1920), (0, 0, 0, 0))
            
            overlay = Image.new("RGBA", (1080, 1920), (0, 0, 0, 0))
            draw_overlay = ImageDraw.Draw(overlay)
            
            if t <= hook_req["duration"]:
                # Hook Phase
                x0_box, y0_box = 90, 785
                x1_box, y1_box = 990, 1135
                # Bounding box for text anchors with black@0.5 and thick outline border
                draw_overlay.rectangle([x0_box, y0_box, x1_box, y1_box], fill=(0, 0, 0, 128))
                draw_overlay.rectangle([x0_box, y0_box, x1_box, y1_box], outline=(0, 0, 0, 255), width=10)
                
                temp_composite = Image.alpha_composite(frame_img, overlay)
                draw_comp = ImageDraw.Draw(temp_composite)
                draw_wrapped_text(draw_comp, quiz_data.get("hook", ""), font_hook, "white", 540, 960, max_width=30)
                frame_img = temp_composite
                
            elif t >= outro_req["start_time"]:
                # Outro Phase
                x0_box, y0_box = 90, 422
                x1_box, y1_box = 990, 1202
                # Bounding box for text anchors with black@0.5 and thick outline border
                draw_overlay.rectangle([x0_box, y0_box, x1_box, y1_box], fill=(0, 0, 0, 128))
                draw_overlay.rectangle([x0_box, y0_box, x1_box, y1_box], outline=(0, 0, 0, 255), width=10)
                
                temp_composite = Image.alpha_composite(frame_img, overlay)
                draw_comp = ImageDraw.Draw(temp_composite)
                
                l1_text = "For more quizzes,"
                draw_shadowed_text(draw_comp, (540 - draw_comp.textlength(l1_text, font=font_outro_l1)/2, 600), l1_text, font=font_outro_l1, fill="white", stroke_width=4)
                
                l2_text = "SUBSCRIBE!"
                draw_shadowed_text(draw_comp, (540 - draw_comp.textlength(l2_text, font=font_outro_l2)/2, 850), l2_text, font=font_outro_l2, fill=(255, 223, 0), stroke_width=5)
                
                l3_text = "And comment your score below! 👇"
                draw_shadowed_text(draw_comp, (540 - draw_comp.textlength(l3_text, font=font_outro_l3)/2, 1100), l3_text, font=font_outro_l3, fill="white", stroke_width=4)
                
                frame_img = temp_composite
                
            else:
                # Questions Phase
                active_q_idx = None
                q_req_idx = 1
                for idx, q in enumerate(questions):
                    q_req = tts_requests[q_req_idx]
                    q_req_idx += 1
                    a_req = tts_requests[q_req_idx]
                    q_req_idx += 1
                    
                    exp_req = None
                    exp_narr = q.get("explanation", "").strip() if not is_rapid else ""
                    if exp_narr:
                        exp_req = tts_requests[q_req_idx]
                        q_req_idx += 1
                        
                    q_start = q_req["start_time"]
                    q_block_end = exp_req["start_time"] + exp_req["duration"] if exp_req else a_req["start_time"] + a_req["duration"]
                    
                    if q_start <= t <= q_block_end:
                        active_q_idx = idx
                        active_q = q
                        active_q_req = q_req
                        active_a_req = a_req
                        active_exp_req = exp_req
                        active_q_start = q_start
                        active_q_block_end = q_block_end
                        break
                        
                if active_q_idx is not None:
                    num = active_q_idx + 1
                    
                    # 1. Question card with black@0.5 anchor base and border
                    draw_overlay.rectangle([40, 218, 1040, 528], fill=(0, 0, 0, 128))
                    draw_overlay.rectangle([40, 218, 1040, 528], outline=(0, 0, 0, 255), width=10)
                    
                    # 2. Options layout
                    options = active_q["options"]
                    correct_idx = active_q.get("answerIndex", -1)
                    correct_answer = active_q.get("answer", "")
                    if correct_idx == -1:
                        for oidx, opt in enumerate(options):
                            if opt.strip() == correct_answer.strip():
                                correct_idx = oidx
                                break
                    if correct_idx == -1:
                        correct_idx = 0
                        
                    opt_labels = ["A", "B", "C", "D"]
                    
                    is_think_phase = active_q["think_start"] <= t <= active_q["think_end"]
                    is_answer_phase = t > active_q["think_end"]
                    
                    for oidx in range(len(options)):
                        opt_y = 680 + oidx * 160
                        x0_box, y0_box, x1_box, y1_box = 90, opt_y, 990, opt_y + 120
                        
                        if is_answer_phase:
                            # Stage 2: Correct/incorrect highlighting (high retention, 80% opacity fill)
                            if oidx == correct_idx:
                                box_color = (46, 204, 113, 204) # green@0.8
                                border_color = (0, 255, 0, 255)
                                text_color = "white"
                                border_w = 6
                            else:
                                box_color = (231, 76, 60, 51) # red@0.2
                                border_color = (192, 57, 43, 102)
                                text_color = "gray"
                                border_w = 2
                        else:
                            # Stage 1: Active options base (black@0.5 fill and outline)
                            box_color = (0, 0, 0, 128)
                            border_color = (255, 255, 255, 77)
                            text_color = "white"
                            border_w = 4
                            
                        draw_overlay.rectangle([x0_box, y0_box, x1_box, y1_box], fill=box_color)
                        draw_overlay.rectangle([x0_box, y0_box, x1_box, y1_box], outline=border_color, width=border_w)
                        
                    # 3. Think phase progress bar
                    if is_think_phase:
                        think_start = active_q["think_start"]
                        think_duration = active_q["think_duration"]
                        
                        # Bar background
                        draw_overlay.rectangle([90, 538, 990, 562], fill=(34, 34, 34, 204))
                        
                        # Bar fill
                        ratio = 1.0 - (t - think_start) / think_duration
                        active_w = int(900 * max(0.0, min(1.0, ratio)))
                        if active_w > 0:
                            draw_overlay.rectangle([90, 538, 90 + active_w, 562], fill=(168, 85, 247, 255))
                            
                    # 4. Explanation box with black@0.5 anchor base and border
                    if is_answer_phase and active_exp_req:
                        exp_start = active_exp_req["start_time"]
                        exp_end = exp_start + active_exp_req["duration"]
                        if exp_start <= t <= exp_end:
                            draw_overlay.rectangle([90, 1632, 990, 1812], fill=(0, 0, 0, 128))
                            draw_overlay.rectangle([90, 1632, 990, 1812], outline=(0, 0, 0, 255), width=10)
                            
                    temp_composite = Image.alpha_composite(frame_img, overlay)
                    draw_comp = ImageDraw.Draw(temp_composite)
                    
                    # 5. Draw text elements on the composite frame with shadows and borders
                    header_text = f"Question {num}/{len(questions)} ({active_q.get('difficulty', 'medium').upper()})"
                    draw_shadowed_text(draw_comp, (540 - draw_comp.textlength(header_text, font=font_header)/2, 228), header_text, font=font_header, fill=(255, 223, 0), stroke_width=4)
                    
                    draw_wrapped_text(draw_comp, active_q["question"], font_question, "white", 540, 388, max_width=28, stroke_width=4)
                    
                    # Option text
                    for oidx in range(len(options)):
                        opt_y = 680 + oidx * 160
                        opt_text = f"{opt_labels[oidx]}. {options[oidx]}"
                        text_color = "white" if not is_answer_phase or oidx == correct_idx else "gray"
                        draw_wrapped_text(draw_comp, opt_text, font_option, text_color, 540, opt_y + 60, max_width=38, stroke_width=4)
                        
                    # Think phase countdown number
                    if is_think_phase:
                        think_end = active_q["think_end"]
                        cnt_num = int(math.ceil(think_end - t))
                        if cnt_num < 1: cnt_num = 1
                        cnt_str = str(cnt_num)
                        draw_shadowed_text(draw_comp, (540 - draw_comp.textlength(cnt_str, font=font_cnt)/2, 574), cnt_str, font=font_cnt, fill="white", stroke_width=4)
                        
                    # Explanation text
                    if is_answer_phase and active_exp_req:
                        exp_start = active_exp_req["start_time"]
                        exp_end = exp_start + active_exp_req["duration"]
                        if exp_start <= t <= exp_end:
                            draw_wrapped_text(draw_comp, active_q.get("explanation", ""), font_exp, "white", 540, 1722, max_width=30, stroke_width=4)
                            
                    frame_img = temp_composite
                    
            # Feature 6: Stamp brand watermark on frame if configured
            if _brand_text and _font_watermark:
                final_draw = frame_img
                if final_draw.mode != "RGBA":
                    final_draw = final_draw.convert("RGBA")
                wm_layer = Image.new("RGBA", final_draw.size, (0, 0, 0, 0))
                wm_draw = ImageDraw.Draw(wm_layer)
                wm_bbox = wm_draw.textbbox((0, 0), _brand_text, font=_font_watermark)
                wm_w = wm_bbox[2] - wm_bbox[0]
                wm_h = wm_bbox[3] - wm_bbox[1]
                margin = 28
                if _brand_pos == "top_left":
                    wm_x, wm_y = margin, margin
                elif _brand_pos == "top_right":
                    wm_x, wm_y = 1080 - wm_w - margin, margin
                elif _brand_pos == "bottom_left":
                    wm_x, wm_y = margin, 1920 - wm_h - margin
                else:  # bottom_right
                    wm_x, wm_y = 1080 - wm_w - margin, 1920 - wm_h - margin
                # Draw shadow + colored text
                wm_draw.text((wm_x + 2, wm_y + 2), _brand_text, font=_font_watermark, fill=(0, 0, 0, 120))
                wm_draw.text((wm_x, wm_y), _brand_text, font=_font_watermark, fill=_brand_color_rgba)
                frame_img = Image.alpha_composite(final_draw, wm_layer)

            out_frame_path = frames_dir / f"frame_{f_idx:05d}.png"
            frame_img.save(out_frame_path, "PNG")
            created_files.add(out_frame_path)
            
        print(f"[PERF METRIC - PILLOW]: Rendered {total_frames} frames in {time.perf_counter() - render_frames_start:.2f} seconds.")
        
        # Build clean audio-only filter graph
        # Video filters: Background flag (0:v) scaled to fit without aspect ratio distortion, then transparent text frames (1:v) overlaid
        filter_parts.append("[0:v]scale=-1:1920,crop=1080:1920:exact=1,setsar=1[bg_scaled]")
        filter_parts.append("[bg_scaled][1:v]overlay=0:0:shortest=1[v_out]")

        # Build clean audio-only filter graph
        filter_complex_file = shm_dir / f"quiz_{job_id}_filter.txt"
        filter_complex_file.write_text(";".join(filter_parts), encoding="utf-8")
        created_files.add(filter_complex_file)
        
        # Build clean FFmpeg sequence concatenation command
        ffmpeg_cmd = [
            ffmpeg_exe,
            "-y",
            "-loop", "1",
            "-framerate", str(fps),
            "-i", str(flag_bg_path),
            "-f", "image2",
            "-framerate", str(fps),
            "-i", str(frames_dir / "frame_%05d.png"),
        ]
        for req in tts_requests:
            ffmpeg_cmd.extend(["-i", str(req["mp3"])])
            
        ffmpeg_cmd.extend(["-i", str(audio_assets["pop"])])
        ffmpeg_cmd.extend(["-i", str(audio_assets["ding"])])
        ffmpeg_cmd.extend(["-stream_loop", "-1", "-i", str(audio_assets["bgm"])])
        
        ffmpeg_cmd.extend([
            "-filter_complex_script", str(filter_complex_file),
            "-map", "[v_out]",
            "-map", "[a_mixed]",
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-threads", "0",
            "-c:a", "aac",
            "-b:a", "192k",
            "-t", f"{total_duration:.3f}",
            "-shortest",
            str(out_final)
        ])
        
        print(f"[FFmpeg] Rendering to local file: {out_final}")
        result_proc = subprocess.run(
            ffmpeg_cmd,
            capture_output=True,
            text=True,
        )
        if result_proc.returncode != 0:
            print(f"[FFmpeg] Error:\n{result_proc.stderr[-3000:]}")
            raise RuntimeError(f"FFmpeg exited with code {result_proc.returncode}")
            
        print(f"[FFmpeg] Render complete. File size: {out_final.stat().st_size / (1024*1024):.2f} MB")
        timings["step4_render_sec"] = time.perf_counter() - ffmpeg_start

        # Upload to Cloudinary
        from datetime import datetime
        import re
        now = datetime.now()
        date_folder = now.strftime("%Y-%m-%d")
        time_str = now.strftime("%H-%M-%S")
        
        country_clean = str(job.get("country") or job.get("quizData", {}).get("country") or "Default").strip().replace(" ", "_")
        country_clean = re.sub(r'[^a-zA-Z0-9_]', '', country_clean)
        
        difficulty_clean = str(job.get("difficulty") or (questions[0].get("difficulty") if questions and len(questions) > 0 else None) or "Medium").strip().capitalize()
        difficulty_clean = re.sub(r'[^a-zA-Z0-9_]', '', difficulty_clean)
        
        version_clean = str(job.get("version") or "1").strip()
        version_clean = re.sub(r'[^a-zA-Z0-9_]', '', version_clean)
        
        folder_path = f"geo_quiz_factory/{date_folder}"
        public_id_str = f"{country_clean}_{difficulty_clean}_Batch_{version_clean}_{time_str}"

        video_url = None
        thumbnail_url = None

        try:
            print(f"[Cloudinary] Uploading video to {folder_path}/{public_id_str} ...")
            upload_res = cloudinary.uploader.upload(
                str(out_final),
                resource_type="video",
                folder=folder_path,
                public_id=public_id_str,
                overwrite=True,
            )
            video_url = upload_res.get("secure_url")
            print(f"[Cloudinary] Video uploaded: {video_url}")
        except Exception as cu_err:
            print(f"[Cloudinary] Video upload failed: {cu_err}. Falling back to static serve.")

        # Upload thumbnail to Cloudinary
        try:
            if out_thumbnail.exists():
                thumb_res = cloudinary.uploader.upload(
                    str(out_thumbnail),
                    resource_type="image",
                    folder=folder_path,
                    public_id=f"{public_id_str}_thumb",
                    overwrite=True,
                )
                thumbnail_url = thumb_res.get("secure_url")
                print(f"[Cloudinary] Thumbnail uploaded: {thumbnail_url}")
        except Exception as tu_err:
            print(f"[Cloudinary] Thumbnail upload failed: {tu_err}")

        print(f"[PERF METRIC - TOTAL]: Worker total execution time: {time.perf_counter() - total_start:.2f} seconds.")

        return {
            "subtitleOverlay": "WORKING",
            "renderProfile": "FAST_QUIZ",
            "fps": 18,
            "resolution": "1080x1920",
            "videoDuration": total_duration,
            "videoUrl": video_url,
            "thumbnailUrl": thumbnail_url,
        }

    finally:
        # Strict memory hygiene: remove all files created in the RAM disk /dev/shm
        print("[Cleanup] Running absolute memory hygiene cleanup...")
        for p in created_files:
            if p.exists():
                try:
                    p.unlink()
                    print(f"[Cleanup] Cleaned up shm file: {p}")
                except Exception as clean_err:
                    print(f"[Cleanup] Error unlinking shm file {p}: {clean_err}")
        # Clean up temp directory if it exists and is empty
        if temp_dir.exists():
            try:
                shutil.rmtree(str(temp_dir), ignore_errors=True)
            except Exception:
                pass


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
        out_dir = job_path.parent / job_id
    else:
        out_dir = job_path.parent.parent / "local-ai" / "output" / job_id

    images_dir = out_dir / "images"
    out_audio = out_dir / "audio.wav"
    out_srt = out_dir / "subtitles.srt"
    out_final = out_dir / "final.mp4"
    out_thumbnail = out_dir / "thumbnail.png"

    contentType = job.get("contentType", "MOTIVATIONAL")
    try:
        if contentType == "QUIZ_SHORTS":
            timings = {
                "step1_images_sec": 0.0,
                "step2_audio_sec": 0.0,
                "step3_subtitles_sec": 0.0,
                "step4_render_sec": 0.0,
            }
            # Ensure output directory exists
            out_dir.mkdir(parents=True, exist_ok=True)
            result = run_quiz_shorts(job, out_dir, out_audio, out_srt, out_final, out_thumbnail, timings)

            # Quiz already streams directly to Cloudinary — do NOT call _finalize_render_and_upload
            # (it would try to re-upload a non-existent local file).
            # Instead write result.json directly here.
            result_payload = {
                "jobId": job_id,
                "status": "completed",
                "videoUrl": result.get("videoUrl"),
                "thumbnailUrl": result.get("thumbnailUrl"),
                "subtitlesUrl": result.get("subtitlesUrl"),
                "renderProfile": result.get("renderProfile", "FAST_QUIZ"),
                "fps": result.get("fps", 18),
                "resolution": result.get("resolution", "1080x1920"),
                "timings": timings,
                "cache": {"hits": 0, "misses": 0},
            }
            result_json_path = out_dir / "result.json"
            result_json_path.write_text(
                json.dumps(result_payload, ensure_ascii=False, indent=2), encoding="utf-8"
            )
            print(f"[Worker] Wrote quiz result.json to {result_json_path}")

            # Update Firestore to completed
            try:
                _init_firebase()
                from firebase_admin import firestore as _fs
                _db = _fs.client()
                _db.collection("videos").document(job_id).set({
                    "status": "completed",
                    "videoUrl": result.get("videoUrl"),
                    "renderProfile": "FAST_QUIZ",
                    "fps": 18,
                    "resolution": "1080x1920",
                }, merge=True)
            except Exception as _fe:
                print(f"[Firebase] Warning: could not mark job completed: {_fe}")

            return

        scenes_list = scenes if isinstance(scenes, list) else []
        if not scenes_list:
            scenes_list = [{"text": "Scene 1"}, {"text": "Scene 2"}]

        # Ensure output and images directories exist
        out_dir.mkdir(parents=True, exist_ok=True)
        images_dir.mkdir(parents=True, exist_ok=True)

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
    except Exception as e:
        print(f"[ERROR][GLOBAL] Rendering failed: {e}")
        try:
            _init_firebase()
            from firebase_admin import firestore
            db = firestore.client()
            db.collection("videos").document(job_id).set({"status": "failed", "error": str(e)}, merge=True)
            print(f"[Firebase] Successfully set failed status for job {job_id}")
        except Exception as fe:
            print(f"[Firebase] Warning: Failed to set failed status: {fe}")
        raise
    finally:
        print("[Cleanup] Running global finally cleanup block...")
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
        for local_file in [out_final, out_thumbnail, out_srt, out_audio]:
            if local_file.exists():
                try:
                    local_file.unlink()
                except Exception:
                    pass
        if out_dir.exists():
            try:
                os.rmdir(out_dir)
            except Exception:
                pass


if __name__ == "__main__":
    main()
