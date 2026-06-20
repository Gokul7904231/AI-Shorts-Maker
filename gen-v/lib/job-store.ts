export type VideoJobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "purged";

export type VideoJob = {
  id: string;
  topic: string;
  style: string;
  renderProfile?: string;
  script: string;
  scenes: any;
  status: VideoJobStatus;
  createdAt: number;
  output?: any;
};

// Deprecated in-memory database functions.
export function createJob(input: Omit<VideoJob, "id" | "status" | "createdAt">): VideoJob {
  console.warn("createJob is deprecated. Use Firestore db instead.");
  return {
    id: "deprecated",
    status: "queued",
    createdAt: Date.now(),
    ...input,
  };
}

export function getJob(id: string): VideoJob | undefined {
  console.warn("getJob is deprecated. Use Firestore db instead.");
  return undefined;
}

export function updateJob(id: string, patch: Partial<VideoJob>): VideoJob | undefined {
  console.warn("updateJob is deprecated. Use Firestore db instead.");
  return undefined;
}

export function listJobs(): VideoJob[] {
  console.warn("listJobs is deprecated. Use Firestore db instead.");
  return [];
}
