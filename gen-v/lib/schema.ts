import { z } from "zod";

export const SceneSchema = z.object({
  id: z.string(),
  text: z.string(),
  imagePrompt: z.string(),
});


export const ScriptSchema = z.object({
  hook: z.string(),
  script: z.string(),
  title: z.string(),
  hashtags: z.array(z.string()),
  scenes: z.array(SceneSchema),
});

export type ScriptModel = z.infer<typeof ScriptSchema>;

export enum ContentType {
  MOTIVATIONAL = "MOTIVATIONAL",
  FACTS = "FACTS",
  STORY = "STORY",
  QUIZ_SHORTS = "QUIZ_SHORTS"
}

export const QuizQuestionSchema = z.object({
  difficulty: z.enum(["easy", "medium", "hard"]),
  question: z.string(),
  options: z.array(z.string()),
  answer: z.string(),
});

export const QuizShortsSchema = z.object({
  contentType: z.literal(ContentType.QUIZ_SHORTS),
  hook: z.string(),
  questions: z.array(QuizQuestionSchema),
  title: z.string().optional(),
  description: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
  renderProfile: z.string().default("FAST_QUIZ"),
  estimatedDuration: z.number().default(45),
});

export type QuizShortsModel = z.infer<typeof QuizShortsSchema>;


