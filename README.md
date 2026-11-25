# Prompt Arena — Vercel deployment

A shared 35-question MCQ competition adapted from the Prompt Engineering Hackathon question paper and instructor answer key. This is an objective knowledge quiz, not automatic assessment of the original six practical projects. Every student answers the same 35 questions; each correct answer earns one mark. Scores are shown immediately. Ranking: score descending, then elapsed time ascending, then server-generated ID for exact ties. Names appear publicly on the final deck; tell participants before they join.

## Run locally (no database required)

1. Install Node.js 22 or later.
2. Extract the ZIP and open a terminal inside the folder containing package.json.
3. Run `npm test` then `npm run dev`.
4. Open http://localhost:3000 (student), http://localhost:3000/admin (instructor, PIN `demo1234`), and http://localhost:3000/stage (projector).
5. Use separate browser profiles or private windows for separate student sessions. Local mode stores data in server memory; restarting deletes the event. It is not intended for public deployment.

## Deploy on Vercel (shared multi-device event)

1. Create a new **private** GitHub repository and upload the extracted project contents (package.json, public/, api/, lib/, etc.). Do not commit actual credentials or the original instructor answer document. The quiz answer key is inside `lib/questions.cjs` and should remain private.
2. Create an Upstash Redis database (via Upstash console or Vercel Marketplace). Copy its REST URL and full-access REST token from the database details.
3. In Vercel, import the GitHub repository as a new project. Use Framework Preset **Other**, root directory containing package.json, and output directory `public` (already configured by vercel.json). No build command is needed.
4. Under Settings → Environment Variables set `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `ADMIN_PIN` (choose a strong unique passphrase), and `EVENT_KEY` (optional; e.g. `ucp-nov2026`). Apply to Production. Do NOT set LOCAL_DEMO on Vercel. Deploy/redeploy after adding variables.
5. Open the deployed URL; confirm that registration loads. Open `/admin` and sign in with your PIN; open `/stage` on the projector. The API uses a shared Redis state, with compare-and-set updates to protect concurrent submissions. No separate backend server is required.

## Event operation

- In `/admin`, set the exact expected attendance and exam duration (default 60 minutes). Share the root website URL with students. They enter only a name; duplicate names must use distinct name variants. Keep the same browser and device until submission.
- Start exam once all expected participants have registered. Registration closes at start. Students see a common countdown, can navigate between questions, and drafts are saved locally. A connected open tab auto-submits when time expires; disconnected or closed tabs cannot reliably auto-submit.
- When the last student submits, final rankings are automatically released. The projector deck polls every 3 seconds and displays gold, silver and bronze positions with confetti. Students see their own score immediately, then a link to the winner deck when released.
- If students abandon the exam or lose internet, the instructor can close it manually; only submitted attempts are ranked. Export CSV from the instructor screen before resetting. Reset deletes all registrations and scores for that event key.

## Important limits / security

Name-only registration is not verified identity or strong proctoring. A name can be impersonated and browser tokens are stored locally; use supervised classroom conditions. The answer key stays server-side, but all students have the same questions. A strong instructor PIN and a private repository are essential. There is no rate limiting, institutional SSO, per-student identity verification or audit-grade persistence. Redis stores names, tokens, scores and timings until reset. Do not publish the admin credentials. Vercel/Redis quotas depend on your plans; test at the expected class size before the real event. Tailwind uses its browser CDN for convenience; local CSS provides the main layout. The CDN is not a compiled production Tailwind build. No live cloud deployment was performed during generation.

## Files

`public/` student, instructor and ceremony UI (HTML, CSS, JS, Tailwind utility classes); `api/event.js` Vercel Node serverless API; `lib/store.cjs` shared Redis storage; `lib/questions.cjs` private answer bank; `dev.cjs` local server; `tests.cjs` automated API workflow test.
