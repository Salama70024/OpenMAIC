# Interactive School — grade 4 science POC

The first iteration is available at `/school` and deliberately leaves the existing OpenMAIC classroom unchanged.

## What is implemented

- Arabic, right-to-left teacher interface for Al-Firdaws Virtual School.
- Original Iraqi grade 4 science textbook PDF, rendered page by page in the browser with PDF.js; no modified textbook pages.
- Teacher navigation to book pages 70, 73, 74, 78 and 81.
- Eight clickable hotspots on original diagrams: butterfly life cycle (pages 73–74), frog life cycle (page 81).
- Context popovers with short textbook-grounded descriptions and one-click suggested questions.
- Optional teacher–assistant chat using the server-held `OPENAI_API_KEY` and OpenAI Responses API; it sees the current book page, selected stage, whether the simulation reveal is open, and the student's last quiz choice. The educational explanation and quiz are authored content and work without the AI service.
- The simulation places authored explanation, scene and quiz in the main reader, leaving the side panel for AI questions only to avoid duplicating lesson content.
- Browser speech recognition still supports single questions with browser text-to-speech answers, subject to the browser's installed Arabic voices.
- Optional **continuous speech-to-speech conversation** through OpenAI Realtime WebRTC. A user click starts the microphone session, the model handles natural turn taking and interruptions, and the live context updates with the displayed textbook stage. The user can mute/end the call. Sessions stop automatically after 3 minutes, on navigation away, or when switching to other audio playback. The server issues only a short-lived client secret; the main API key stays on the server.
- The "listen to lesson" and welcome buttons play a real MP3 rather than relying on browser speech synthesis. The endpoint accepts only preapproved authored text. It first looks for `public/school/audio/<stage-id>.mp3` (for example, `public/school/audio/butterfly-egg.mp3`, or `welcome.mp3`), then generates and caches a fallback MP3 through OpenAI's Speech API when necessary. The static recording is preferred when supplied.
- The assistant status checks whether a server key is configured, **not** whether the account/model has successfully answered a live request.
- Existing OpenMAIC site `ACCESS_CODE` middleware continues to guard the school API routes.

## Required files and configuration

- `public/books/grade-4-science.pdf`: original official textbook. Current source: the uploaded user-provided PDF (216 pages, 14.2 MB). Keep the file name stable.
- `public/school/pdf.worker.min.mjs`: generated automatically by `scripts/copy-school-pdf-worker.mjs` during `dev` and `build` from the pinned `pdfjs-dist@4.8.69` package. Do not commit the generated asset.
- Production Vercel: `OPENAI_API_KEY`, `DEFAULT_MODEL=openai:gpt-5.6`, `OPENAI_MODELS=gpt-5.6` (already configured on the project as of 2026-11-15).
- Local development: put `OPENAI_API_KEY` in `.env.local` only. Do not commit credentials.
- Optional: set `SCHOOL_OPENAI_MODEL` to a separate OpenAI model name (such as `gpt-4.1-mini`) to keep classroom assistant usage independent from the general OpenMAIC default model.
- Optional: `SCHOOL_REALTIME_MODEL=gpt-realtime-2.1-mini` (cost-conscious live-voice default) and `SCHOOL_TTS_MODEL=gpt-4o-mini-tts` (temporary fallback only).
- **Migration note:** As of November 2026, the Speech API TTS models are scheduled for retirement on January 6, 2027. For maintained school content, generate and review MP3 recordings once, save them under `public/school/audio/`, and stop depending on runtime Speech API synthesis. Future live voice uses Realtime, not the deprecated Speech API.

## Development and tests

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm dev
# open http://localhost:3000/school
corepack pnpm exec vitest run tests/school
```

## Future milestones

1. Verify the viewer and hotspots on desktop/projector and mobile (original PDF + overlay must stay aligned).
2. Test the grounded assistant using the actual production OpenAI key, logging only nonsensitive errors; automated tests mock model calls and do not prove the live account is ready.
3. **Live manual acceptance:** verify real Realtime audio, microphone permission, interruption, Arabic pronunciation, model entitlement, and voice session cost. Automated tests are mocked and do not establish account access or low latency.
4. Upload approved Arabic MP3 narration for every stage so the curriculum no longer needs an on-demand TTS provider, and replace the deprecated fallback by January 2027.
5. Add a teacher-managed annotation editor so subsequent book pages/subjects require content mapping rather than code changes.

The book belongs to the project's Git repository for this fixed single-book POC. Future teacher uploads could move to Vercel Blob without changing the PDF viewer's data model.
