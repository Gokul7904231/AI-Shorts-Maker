export type RetrievalResult = {
  id: string;
  text: string;
  score?: number;
};

export async function retrieve(_query: string): Promise<RetrievalResult[]> {
  // Placeholder for future Chroma wiring.
  return [];
}

