export type UploadAgentInput = {
  // Scaffolding for future YouTube/Instagram automation.
  videoPath: string;
};

export async function uploadAgent(_input: UploadAgentInput): Promise<{ status: "queued" | "uploaded" }> {
  // Human approval workflow should wrap this in the UI.
  return { status: "queued" };
}

