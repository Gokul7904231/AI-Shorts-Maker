# TODO - Immediate verification sprint (no new features)

- [x] Step 1: Create a minimal test jobId and payload json under gen-v/generated/jobs and run the local python pipeline through the Next.js codepath.
- [ ] Step 2: Verify local filesystem outputs match contract:
  - [ ] output/{jobId}/images/
  - [ ] audio.wav
  - [ ] subtitles.srt
  - [ ] final.mp4
  - [ ] result.json
- [ ] Step 3: Check final.mp4 playability via ffprobe.
- [ ] Step 4: Identify likely first breakpoints (Windows runtime/ffmpeg/codec/subtitle timing) based on actual logs.

# Runtime stabilization sprint

- [ ] Implement runtime reliability + media validation in hybrid-video/scripts/create_short.py:
  - [ ] Step timing logs for STEP 1..4
  - [ ] Explicit [ERROR][STEP X] logging around edge-tts, Whisper->SRT, MoviePy render
  - [ ] MoviePy subtitle Windows font fallback hardening (no Arial-only)
  - [ ] Emergency subtitle overlay fallback (still produce final.mp4)
  - [ ] ffprobe-based playability verification and duration/audio checks
  - [ ] result.json fields: subtitleOverlay, playable, audioDetected, videoDuration

