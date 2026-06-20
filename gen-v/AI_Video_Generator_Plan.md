# AI Short Video Generator - Project Execution Plan

## Architecture Overview
*   **Frontend:** Next.js 14 (App Router), React, Tailwind CSS, Shadcn UI.
*   **Authentication:** Clerk.
*   **Database:** Neon (Serverless PostgreSQL) + Drizzle ORM.
*   **Storage:** Firebase Storage.
*   **Video Engine:** Remotion.js.
*   **AI Orchestration Pipeline:**
    1.  Gemini API (Script & Image Prompts)
    2.  Google Cloud Text-to-Speech (Audio Generation)
    3.  AssemblyAI (Caption Timestamps)
    4.  Replicate API - HDX Lightning (Image Generation)

## Phase 1: Setup & UI Foundation
1. Initialize Next.js project with Tailwind CSS.
2. Install and configure Shadcn UI (setup `components.json`, add Button, Select, Textarea, Dialog, Toast).
3. Set up the generic layout with a Sidebar and Header.
4. Install Lucide React for UI icons.

## Phase 2: Authentication & Database Schema
1. Integrate Clerk Next.js SDK. Protect the `/dashboard` route in `middleware.js`.
2. Create custom `/sign-in` and `/sign-up` pages.
3. Configure Neon Database connection using Drizzle ORM (`drizzle.config.js`, `db.js`).
4. Create the `schema.js` file with two tables:
    *   `users`: id, name, email, imageUrl, credits (default 30).
    *   `videoData`: id, script (json), audioFileUrl (varchar), captions (json), imageList (array), createdBy (varchar).
5. Add a `DB push` script to update the Neon database.

## Phase 3: Dashboard & Form Collection
1. Create a `UserDetailContext` to manage and display user credits globally.
2. Build the `/dashboard` route to display an empty state or a grid of generated videos.
3. Build the `/dashboard/create-new` page to collect generation parameters:
    *   Topic (Historical, Motivational, Custom Prompt).
    *   Style (Realistic, Comic, Watercolor).
    *   Duration (30s or 60s).

## Phase 4: The AI Orchestration Pipeline (Backend APIs)
*Create separate Next.js Route Handlers for each step, passing the output of one as the input to the next.*
1. **`/api/generate-script` (Gemini):** Pass topic, style, and duration. Return a JSON array of scenes (contactText, imagePrompt).
2. **`/api/generate-audio` (Google TTS & Firebase):** Concatenate text, generate MP3 buffer, upload to Firebase Storage, and return the download URL.
3. **`/api/generate-caption` (AssemblyAI):** Send Firebase MP3 URL to AssemblyAI. Return the array of words with `startTime` and `endTime`.
4. **`/api/generate-image` (Replicate & Firebase):** Iterate through `imagePrompt` array. Call Replicate HDX Lightning model. Fetch the resulting image URLs as base64 buffers, upload to Firebase, and return the permanent Firebase URLs.
5. **Database Insertion:** Save the combined JSON object (script, audio URL, captions, image URLs) to the `videoData` table and deduct 10 credits from the `users` table.

## Phase 5: Video Assembly & Playback (Remotion)
1. Initialize Remotion in the project (`composition.tsx`, `root.tsx`).
2. Create `<RemotionVideo />` component taking the database object as props.
3. Map over `imageList` inside a `<Sequence />` component. Calculate frame durations dynamically based on total video length.
4. Add the Firebase Audio URL using Remotion's `<Audio />` component.
5. Sync Captions: Use `useCurrentFrame()` to cross-reference AssemblyAI timestamps and display the current spoken word.
6. Apply `interpolate` for a subtle zoom-in/zoom-out effect on the images.
7. Wrap `<RemotionVideo />` in a Shadcn Dialog on the frontend for playback.
   ## Phase 6: Dashboard UI Polish & Edge Cases
1. **Video Grid:** On the `/dashboard` route, fetch the user's generated videos from the `videoData` table. Render them as a grid using Remotion's `<Thumbnail/>` component so users can preview their creations.
2. **Empty State:** Create an `<EmptyState/>` component showing a prompt to "Create your first video" if the database returns 0 records.
3. **Custom Loader:** Implement the `<CustomLoading/>` dialog using Shadcn. This must lock the screen and show a visual indicator (like a GIF) while the heavy AI orchestration pipeline runs.

## Phase 7: SaaS Guardrails 
1. **Credit Enforcement:** Before firing the Phase 4 API pipeline, verify the user's credits. If `< 10`, block the execution and trigger a Shadcn Toast error indicating "Insufficient Credits."
2. **State Cleanup:** Once a video is successfully saved to the Neon database, completely clear the React Context holding the temporary video data to prevent caching issues on subsequent generations.

## Phase 8: Production-Ready Deployment
1. **Environment Audit:** Create a `.env.example` file mapping out all required keys (Clerk, Neon, Gemini, Google TTS, AssemblyAI, Replicate, Firebase).
2. **Containerization & CI/CD:** Write a production-grade `Dockerfile` optimized for a Next.js application to ensure environments are perfectly mirrored. 
3. **Automated Workflow:** Set up a GitHub Actions workflow (`deploy.yml`) to automatically build and test the Docker container on push, preparing it for deployment to a containerized hosting platform.