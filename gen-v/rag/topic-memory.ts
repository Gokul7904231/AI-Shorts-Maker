export type TopicMemoryEntry = {
  topic: string;
  hook: string;
  title: string;
  timestamp: number;
};

const entries: TopicMemoryEntry[] = [];

function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function keywords(s: string) {
  const stop = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "to",
    "of",
    "in",
    "on",
    "for",
    "with",
    "how",
    "why",
    "when",
    "is",
    "are",
    "be",
    "it",
    "this",
    "that",
    "your",
    "you",
    "we",
    "i",
    "most",
  ]);

  return normalize(s)
    .split(" ")
    .filter((w) => w.length >= 3 && !stop.has(w));
}

function jaccard(a: string[], b: string[]) {
  const A = new Set(a);
  const B = new Set(b);
  const inter = Array.from(A).filter((x) => B.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : inter / union;
}

export function addTopicMemory(entry: Omit<TopicMemoryEntry, "timestamp">) {
  entries.push({ ...entry, timestamp: Date.now() });
}

export function listTopicMemory() {
  return [...entries];
}

export function findSimilarTopic(args: {
  topic: string;
  hook: string;
  title: string;
  // how similar keywords must be to count as duplicate
  threshold?: number;
}): { entry: TopicMemoryEntry; similarity: number }[] {
  const threshold = args.threshold ?? 0.55;

  const hookK = keywords(args.hook);
  const titleK = keywords(args.title);
  const topicK = keywords(args.topic);

  const results: { entry: TopicMemoryEntry; similarity: number }[] = [];

  for (const entry of entries) {
    const entryHookK = keywords(entry.hook);
    const entryTitleK = keywords(entry.title);
    const entryTopicK = keywords(entry.topic);

    // Blend: hook similarity should weigh most.
    const sHook = jaccard(hookK, entryHookK);
    const sTitle = jaccard(titleK, entryTitleK);
    const sTopic = jaccard(topicK, entryTopicK);

    const similarity = sHook * 0.55 + sTitle * 0.3 + sTopic * 0.15;

    if (similarity >= threshold) {
      results.push({ entry, similarity });
    }
  }

  return results.sort((a, b) => b.similarity - a.similarity);
}

