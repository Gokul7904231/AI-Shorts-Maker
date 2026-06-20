# 🎬 AI Shorts Factory: Scalable Serverless Video Pipeline

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?logo=fastapi)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python)
![Firebase](https://img.shields.io/badge/Firestore-Serverless-FFCA28?logo=firebase)
![Cloudinary](https://img.shields.io/badge/Cloudinary-CDN-3448C5?logo=cloudinary)
![Lightning AI](https://img.shields.io/badge/Lightning_AI-GPU_Compute-792EE5?logo=lightning)

> A production-grade, decoupled microservice architecture that completely automates the generation, rendering, and cloud storage of AI-scripted short-form video content.

## 📖 Overview

The **AI Shorts Factory** is a full-stack cloud application designed to orchestrate heavy video rendering workloads across isolated, stateless environments. By decoupling the user interface from the rendering engine, this architecture solves the traditional bottlenecks of automated video generation: heavy compute costs, localized file-locking collisions, and storage bloat.

It utilizes a Next.js control plane to manage job queues via Firebase Firestore, securely dispatching heavy MoviePy/FFmpeg rendering tasks to an isolated Lightning AI GPU worker, and streaming the final massive `.mp4` assets to Cloudinary's global CDN.

## 🏗️ System Architecture

The project is split into two isolated environments communicating securely over HTTPS:

```mermaid
graph TD
    A[Next.js App UI] -->|Auth Token| B(Clerk Identity Layer)
    A -->|1. Create Job| C[(Firebase Firestore)]
    A -->|2. Secure Trigger| D(FastAPI Server :8000)
    D -->|3. Generate Script| E[Groq / Gemini AI]
    D -->|4. Render Video| F[MoviePy + FFmpeg]
    F -->|5. Stream Upload| G((Cloudinary CDN))
    D -->|6. Update Status| C
    H[Vercel Cron Job] -->|7. Nightly Purge| C
    H -->|8. Delete Asset| G
```

## ✨ Key Engineering Achievements

*   **Stateless Microservice Decoupling:** Separated the Next.js frontend from the Python rendering engine. The FastAPI worker is stateless; it pulls configurations, compiles the video, pushes to the cloud, and wipes its local execution context immediately.
*   **Cost-Optimized Asset Lifecycle:** Implemented an automated Vercel Cron route (`/api/cron/cleanup`) that executes a nightly database scan, permanently purging heavy video files from Cloudinary (video, thumbnail, subtitles) older than 48 hours to protect free-tier bandwidth, while retaining the telemetry metadata in Firestore.
*   **Zero-Trust Security:** The FastAPI rendering endpoint is protected by an internal `HTTPBearer` authorization lock, rejecting unauthenticated execution triggers to prevent malicious compute drain.
*   **FFmpeg Pipeline Optimization:** Bypassed MoviePy's standard high-latency audio array compilation by utilizing multithreaded raw FFmpeg stream muxing, dropping compilation times significantly.
*   **Build-Time Safeguards:** Engineered self-healing Firebase Admin stubs to prevent Next.js static compilation crashes in Vercel environments lacking runtime credentials.

## 💻 Tech Stack

### Frontend / Control Plane
*   **Framework:** Next.js 16 (App Router)
*   **Auth:** Clerk
*   **Styling:** Tailwind CSS

### Backend / Database
*   **Database:** Firebase Firestore (Admin SDK / NoSQL)
*   **Media Storage:** Cloudinary (Python & Node.js SDKs)
*   **Automation:** Vercel Cron Jobs

### Rendering Engine (Worker Node)
*   **Server:** FastAPI / Uvicorn (Hosted on Lightning AI)
*   **Video/Audio Processing:** MoviePy, FFmpeg, Pillow, edge-tts
*   **AI Providers:** Groq, Google Gemini

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/ai-shorts-factory.git
cd ai-shorts-factory
```

### 2. Environment Variables
You must configure two separate `.env` files.

**Frontend (`gen-v/.env`):**
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
CLOUDINARY_CLOUD_NAME=your_name
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
INTERNAL_API_SECRET_KEY=secure_token
NEXT_PUBLIC_RENDER_ENGINE_URL=http://localhost:8000
```

**Rendering Engine (`vps-rendering-engine/.env`):**
```env
CLOUDINARY_CLOUD_NAME=your_name
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
INTERNAL_API_SECRET_KEY=secure_token
```

### 3. Run the Microservices Locally

**Terminal 1 (Next.js):**
```bash
cd gen-v
npm install
npm run dev
```

**Terminal 2 (FastAPI Rendering Engine):**
*(Requires Python 3.10+ and system-level FFmpeg)*
```bash
cd vps-rendering-engine
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

## 📊 Telemetry & Admin Dashboard

The system tracks execution duration and storage capacity dynamically. Access the internal metrics layer via `/recent-renders` to view active cloud processing states and historical computational spend.

---

Designed and Architected by **[Your Name]**  
Open to Software Engineering and Cloud Architecture roles.  
[LinkedIn] | [Portfolio]
