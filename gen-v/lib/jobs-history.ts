import { db } from "./firebase-admin";

export interface VideoJob {
  id: string;
  jobId: string;
  userId: string;
  script: string;
  contentType: "MOTIVATIONAL" | "FACTS" | "STORY" | "QUIZ_SHORTS";
  videoUrl: string | null;
  cloudinaryPublicId: string | null;
  status: "queued" | "processing" | "completed" | "failed" | "purged";
  createdAt: any;
  renderDurationSeconds: number;
  videoSizeMb: number;
  topic?: string;
  thumbnailUrl?: string;
  renderProfile?: string;
  fps?: number;
  resolution?: string;
  timings?: any;
  cache?: any;
  quizData?: any;
  scenes?: any;
}

// Replaces reading a local index.json file
export async function getJobsIndex(userId: string = "anonymous"): Promise<VideoJob[]> {
  const snapshot = await db
    .collection("videos")
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .get();

  const jobs: VideoJob[] = [];
  snapshot.forEach((doc) => {
    const data = doc.data();
    jobs.push({ id: doc.id, jobId: doc.id, ...data } as VideoJob);
  });
  return jobs;
}

// Replaces writing to individual local JSON sheets
export async function saveJobManifest(jobId: string, payload: Partial<VideoJob>): Promise<void> {
  const docRef = db.collection("videos").doc(jobId);
  await docRef.set(
    {
      ...payload,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

// Replaces fetching a local file sheet
export async function readJobManifest(jobId: string): Promise<VideoJob | null> {
  const doc = await db.collection("videos").doc(jobId).get();
  if (!doc.exists) return null;
  const data = doc.data();
  return { id: doc.id, jobId: doc.id, ...data } as VideoJob;
}

// Keep backward compatible writeJobManifest/upsertJobIndexItem exports for compatibility
export async function writeJobManifest(jobId: string, manifest: any) {
  await saveJobManifest(jobId, manifest);
}

export async function upsertJobIndexItem(item: any) {
  await saveJobManifest(item.jobId, item);
}
