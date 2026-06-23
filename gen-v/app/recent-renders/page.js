export const dynamic = "force-dynamic";

import fs from "fs";
import path from "path";
import Link from "next/link";

import { readJobManifest, getJobsIndex } from "../../lib/jobs-history";
import ProviderReliabilityPanel from "./provider-reliability";

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default async function RecentRendersPage() {
  const indexItems = await getJobsIndex();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black flex flex-col items-center py-10 px-6">
      <div className="w-full max-w-6xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              Recent Renders
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1 text-sm">
              Re-open completed jobs from your creator workflow.
            </p>
          </div>
          <Link
            href="/"
            className="px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50"
          >
            Back to Preview
          </Link>
        </div>

        {indexItems.length === 0 ? (
          <div className="mt-8 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black text-zinc-600 dark:text-zinc-400">
            No completed renders yet. Generate your first video from Preview.
          </div>
        ) : (
          <>
            <ProviderReliabilityPanel />
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {indexItems
                .filter((x) => x.status === "completed" || x.status === "purged")
                .slice(0, 60)
                .map((item) => {
                  const manifest = item;

                  const thumbnailUrl = item.thumbnailUrl ?? manifest?.thumbnailUrl;
                  const renderProfile = item.renderProfile ?? manifest?.renderProfile;

                  const videoUrl = item.videoUrl ?? `/api/media/video/${item.jobId}`;
                  const reopenHref = `/?jobId=${encodeURIComponent(item.jobId)}`;

                  return (
                    <div
                      key={item.jobId}
                      className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black overflow-hidden"
                    >
                      <div className="p-3">
                        <div className="aspect-[9/16] w-full rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
                          {thumbnailUrl ? (
                            <img
                              src={thumbnailUrl}
                              alt="thumbnail"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
                              No thumbnail
                            </div>
                          )}
                        </div>

                        <div className="mt-3">
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            {formatDate(item.createdAt)}
                          </div>
                          <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-50 mt-1 line-clamp-2">
                            {item.topic}
                          </div>
                          <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                            Profile: {renderProfile ?? "N/A"}
                          </div>
                        </div>

                        <div className="mt-3 flex flex-col gap-2">
                          {item.status === "purged" ? (
                            <div className="px-3 py-2 rounded bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-500 text-center text-sm font-medium">
                              Purged (Expired)
                            </div>
                          ) : (
                            <>
                              <a
                                href={videoUrl}
                                className="px-3 py-2 rounded bg-zinc-900 text-white dark:bg-zinc-50 dark:text-black text-center"
                              >
                                Play
                              </a>
                              <a
                                href={videoUrl}
                                download
                                className="px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 text-center"
                              >
                                Download MP4
                              </a>
                            </>
                          )}
                          <Link
                            href={reopenHref}
                            className="px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 text-center"
                          >
                            Re-open
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

