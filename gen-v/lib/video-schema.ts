import { z } from "zod";

export const VideoGenerationResultSchema = z.object({
  jobId: z.string(),
  status: z.string(),

  // artifacts
  sceneFiles: z.array(z.string()).optional().default([]),
  finalVideo: z.string().optional(),
  thumbnail: z.string().optional(),
  subtitles: z.string().optional(),

  subtitleOverlay: z.string().optional(),

  // profile
  renderProfile: z.string().optional(),
  fps: z.number().optional(),
  resolution: z.string().optional(),

  // analytics
  timings: z
    .object({
      step1_images_sec: z.number().nullable().optional(),
      step2_audio_sec: z.number().nullable().optional(),
      step3_subtitles_sec: z.number().nullable().optional(),
      step4_render_sec: z.number().nullable().optional(),
    })
    .optional(),

  cache: z
    .object({
      hits: z.number().optional(),
      misses: z.number().optional(),
    })
    .optional(),

  // probing
  playable: z.boolean().optional(),
  audioDetected: z.boolean().optional(),
  videoDuration: z.number().nullable().optional(),
});

export type VideoGenerationResult = z.infer<typeof VideoGenerationResultSchema>;


