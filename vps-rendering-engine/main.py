import os
import sys
import uuid
import json
import time
import shutil
import logging
import subprocess
from pathlib import Path
from typing import Optional, List, Dict, Any
from concurrent.futures import ThreadPoolExecutor

from fastapi import FastAPI, BackgroundTasks, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("render-engine")

app = FastAPI(
    title="VPS Shorts Rendering Engine",
    description="Microservice for heavy Python MoviePy rendering pipeline"
)

# Enable CORS for Next.js frontend calls
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production if needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directory Setup
BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "output"
JOBS_DIR = OUTPUT_DIR / "jobs"
JOBS_DIR.mkdir(parents=True, exist_ok=True)

# Mount Static Files to serve videos, thumbnails, and subtitles
app.mount("/static", StaticFiles(directory=str(OUTPUT_DIR)), name="static")

# Thread Pool Queue Config
MAX_CONCURRENT_JOBS = int(os.environ.get("MAX_CONCURRENT_JOBS", 1))
executor = ThreadPoolExecutor(max_workers=MAX_CONCURRENT_JOBS)
logger.info(f"Initialized ThreadPoolExecutor with max_workers={MAX_CONCURRENT_JOBS}")

# Security Setup
security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    secret_key = os.environ.get("INTERNAL_API_SECRET_KEY")
    if not secret_key:
        raise HTTPException(
            status_code=401,
            detail="INTERNAL_API_SECRET_KEY environment variable is not configured."
        )
    if credentials.credentials != secret_key:
        raise HTTPException(
            status_code=401,
            detail="Invalid API credentials."
        )
    return credentials.credentials

# Schemas
class SceneInput(BaseModel):
    id: Optional[Any] = None
    text: Optional[str] = None
    contactText: Optional[str] = None
    imagePrompt: Optional[str] = None

class QuizQuestionInput(BaseModel):
    difficulty: str
    question: str
    options: List[str] = []
    answer: str

class RenderJobRequest(BaseModel):
    jobId: Optional[str] = None
    topic: str
    style: Optional[str] = ""
    script: Optional[str] = ""
    scenes: Optional[List[SceneInput]] = []
    contentType: Optional[str] = "MOTIVATIONAL"
    hook: Optional[str] = ""
    questions: Optional[List[QuizQuestionInput]] = []
    renderProfile: Optional[str] = "STANDARD_SHORTS"
    title: Optional[str] = ""
    description: Optional[str] = ""
    hashtags: Optional[List[str]] = []

# Persistent Storage Helper Functions
def get_job_path(job_id: str) -> Path:
    return JOBS_DIR / f"{job_id}.json"

def read_job_file(job_id: str) -> Optional[dict]:
    p = get_job_path(job_id)
    if not p.exists():
        return None
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception as e:
        logger.error(f"Error reading job file {p}: {e}")
        return None

def write_job_file(job_id: str, data: dict):
    p = get_job_path(job_id)
    try:
        p.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception as e:
        logger.error(f"Error writing job file {p}: {e}")

# The Background Worker Function
def execute_render_task(job_id: str):
    logger.info(f"[Worker] Starting render task for job {job_id}")
    job = read_job_file(job_id)
    if not job:
        logger.error(f"[Worker] Job {job_id} manifest missing.")
        return

    # Update state to processing
    job["status"] = "processing"
    write_job_file(job_id, job)

    script_path = BASE_DIR / "scripts" / "create_short.py"
    job_payload_path = OUTPUT_DIR / f"{job_id}_payload.json"
    
    try:
        # Write temporary payload file for create_short.py reader
        job_payload_path.write_text(json.dumps(job, ensure_ascii=False, indent=2), encoding="utf-8")
        
        # Execute process
        cmd = [sys.executable, str(script_path), str(job_payload_path)]
        logger.info(f"[Worker] Spawning: {' '.join(cmd)}")
        
        env = os.environ.copy()
        env["PYTHONIOENCODING"] = "utf-8"
        env["PYTHONUTF8"] = "1"

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            env=env,
            check=False
        )

        logger.info(f"[Worker] Subprocess output:\n{result.stdout}")
        if result.stderr:
            logger.warning(f"[Worker] Subprocess stderr:\n{result.stderr}")

        if result.returncode != 0:
            raise RuntimeError(f"Rendering script exited with code {result.returncode}")

        # Read create_short.py produced result.json
        result_json_path = OUTPUT_DIR / job_id / "result.json"
        if not result_json_path.exists():
            raise FileNotFoundError(f"result.json not generated by create_short.py at {result_json_path}")

        render_output = json.loads(result_json_path.read_text(encoding="utf-8"))
        
        # Update manifest to completed
        job["status"] = "completed"
        job["output"] = render_output
        write_job_file(job_id, job)
        logger.info(f"[Worker] Rendering completed successfully for job {job_id}")

    except Exception as e:
        logger.exception(f"[Worker] Rendering failed for job {job_id}")
        job["status"] = "failed"
        job["error"] = str(e)
        write_job_file(job_id, job)
    finally:
        # Cleanup temporary payload
        if job_payload_path.exists():
            try:
                job_payload_path.unlink()
            except Exception:
                pass

# Re-queue queued/processing jobs on startup
@app.on_event("startup")
def startup_requeue():
    logger.info("Scanning for unfinished jobs to re-queue...")
    if not JOBS_DIR.exists():
        return
    
    count = 0
    for file in JOBS_DIR.glob("*.json"):
        try:
            job = json.loads(file.read_text(encoding="utf-8"))
            status = job.get("status")
            job_id = job.get("jobId")
            if status in ["queued", "processing"] and job_id:
                # Re-queue
                job["status"] = "queued"
                write_job_file(job_id, job)
                executor.submit(execute_render_task, job_id)
                count += 1
        except Exception as e:
            logger.error(f"Failed to scan file {file} on startup: {e}")
    if count > 0:
        logger.info(f"Re-queued {count} unfinished jobs on startup.")
    else:
        logger.info("No unfinished jobs found.")

# API Endpoints
@app.post("/render-video")
def render_video(payload: RenderJobRequest, token: str = Depends(verify_token)):
    job_id = payload.jobId or str(uuid.uuid4())
    logger.info(f"Received render request, using jobId: {job_id}")
    
    # Map scenes model to dict list
    scenes_list = []
    for s in (payload.scenes or []):
        scenes_list.append({
            "id": s.id,
            "text": s.text,
            "contactText": s.contactText,
            "imagePrompt": s.imagePrompt
        })
        
    # Map questions model to dict list
    questions_list = []
    for q in (payload.questions or []):
        questions_list.append({
            "difficulty": q.difficulty,
            "question": q.question,
            "options": q.options,
            "answer": q.answer
        })

    # Prepare persistent database payload
    job_data = {
        "jobId": job_id,
        "topic": payload.topic,
        "style": payload.style,
        "script": payload.script,
        "scenes": scenes_list,
        "contentType": payload.contentType,
        "hook": payload.hook,
        "questions": questions_list,
        "renderProfile": payload.renderProfile,
        "title": payload.title,
        "description": payload.description,
        "hashtags": payload.hashtags,
        "status": "queued",
        "createdAt": int(time.time() * 1000)
    }

    # Persist job JSON
    write_job_file(job_id, job_data)
    
    # Queue task execution in ThreadPoolExecutor
    executor.submit(execute_render_task, job_id)
    
    return {
        "videoId": job_id,
        "status": "queued"
    }

@app.get("/job-status/{job_id}")
def get_job_status(job_id: str, request: Request):
    job = read_job_file(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    base_url = str(request.base_url).rstrip("/")
    status = job.get("status")
    
    response = {
        "id": job_id,
        "status": status,
        "videoUrl": None,
        "thumbnailUrl": None,
        "subtitlesUrl": None,
        "output": None
    }

    if status == "completed" and job.get("output"):
        output = job["output"]
        
        # Absolute public download URLs pointing to static folder
        video_url = f"{base_url}/static/{job_id}/final.mp4"
        thumbnail_url = f"{base_url}/static/{job_id}/thumbnail.png"
        subtitles_url = f"{base_url}/static/{job_id}/subtitles.srt"

        response["videoUrl"] = video_url
        response["thumbnailUrl"] = thumbnail_url
        response["subtitlesUrl"] = subtitles_url
        
        # Provide compatible .output object for Next.js detailed UI reads
        response["output"] = {
            "renderProfile": output.get("renderProfile", job.get("renderProfile")),
            "fps": output.get("fps"),
            "resolution": output.get("resolution"),
            "videoUrl": video_url,
            "thumbnailUrl": thumbnail_url,
            "subtitlesUrl": subtitles_url,
            "timings": output.get("timings"),
            "cache": output.get("cache"),
        }
    elif status == "failed":
        response["error"] = job.get("error", "Unknown render error")

    return response
