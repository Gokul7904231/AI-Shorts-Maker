import fs from "fs";
import { spawn } from "child_process";
import path from "path";

// ── Local hybrid-video environment ───────────────────────────────────────────
// Resolve hybrid-video relative to this repo (gen-v/ is a subfolder).
function getHybridRoot(): string {
  // __dirname: <repo>/gen-v/lib
  // hybrid-video: <repo>/hybrid-video
  return path.join(/*turbopackIgnore: true*/ __dirname, "..", "..", "hybrid-video");
}

function resolveHybridPython(): string {
  const hybridRoot = getHybridRoot();
  const candidates = [
    path.join(/*turbopackIgnore: true*/ hybridRoot, "venv", "Scripts", "python.exe"),
    path.join(/*turbopackIgnore: true*/ hybridRoot, "venv", "bin", "python"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      const venvDir = path.dirname(path.dirname(c));
      if (fs.existsSync(path.join(/*turbopackIgnore: true*/ venvDir, "pyvenv.cfg"))) {
        return c;
      }
    }
  }
  return "python";
}

function resolveHybridScript(): string {
  const hybridRoot = getHybridRoot();
  const candidate = path.join(/*turbopackIgnore: true*/ hybridRoot, "scripts", "create_short.py");

  if (fs.existsSync(candidate)) return candidate;

  // Fail fast (no silent fallback) so Next.js logs show the missing runtime.
  throw new Error(
    `Hybrid runtime script not found at: ${candidate}. Expected hybrid-video/scripts/create_short.py.`
  );
}



// ── Fallback resolution ───────────────────────────────────────────────────────
function resolvePythonExecutable(): string {
  const hybridPython = resolveHybridPython();
  if (hybridPython !== "python") return hybridPython;

  // local-ai venv beside the Next.js project (legacy)
  const localVenv = path.join(
    /*turbopackIgnore: true*/ __dirname,
    "..",
    "..",
    "local-ai",
    "venv",
    "Scripts",
    "python.exe"
  );
  if (fs.existsSync(localVenv)) return localVenv;

  return "python"; // system Python last resort
}

function resolveScript(): string {
  return resolveHybridScript();
}


// ── Public API ────────────────────────────────────────────────────────────────
export async function runLocalGeneration(jobPath: string): Promise<void> {
  const pythonExe = resolvePythonExecutable();
  const scriptPath = resolveScript();

  console.log(`[python-runner] Python : ${pythonExe}`);
  console.log(`[python-runner] Script : ${scriptPath}`);
  console.log(`[python-runner] Job    : ${jobPath}`);

  return new Promise((resolve, reject) => {
    const p = spawn(pythonExe, [scriptPath, jobPath], {
      // cwd = repo root so relative paths inside the script work
      cwd: path.join(/*turbopackIgnore: true*/ __dirname, "..", ".."),
      shell: false,
      env: {
        ...process.env,
        // Force UTF-8 stdout so Windows cp1252 never causes UnicodeEncodeError
        PYTHONIOENCODING: "utf-8",
        PYTHONUTF8: "1",
        // Silence the HuggingFace symlinks warning (harmless on Windows)
        HF_HUB_DISABLE_SYMLINKS_WARNING: "1",
      },
    });

    let stdout = "";
    let stderr = "";

    p.stdout?.on("data", (chunk) => {
      process.stdout.write(chunk);
      stdout += chunk.toString();
    });

    p.stderr?.on("data", (chunk) => {
      process.stderr.write(chunk);
      stderr += chunk.toString();
    });

    p.on("error", (err) => reject(err));

    p.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `python exited with code ${code}.\n--- stdout ---\n${stdout}\n--- stderr ---\n${stderr}`
        )
      );
    });
  });
}
