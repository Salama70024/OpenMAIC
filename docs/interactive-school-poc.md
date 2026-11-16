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
- Browser speech recognition sends a student's transcribed question to the assistant, and the answer is read aloud through browser text-to-speech; per-answer playback and an automatic reading toggle are available. **This is not OpenAI Realtime WebRTC yet**; it depends on browser support, speech permissions and installed Arabic voices.
- The assistant status checks whether a server key is configured, **not** whether the account/model has successfully answered a live request.
- Existing OpenMAIC site `ACCESS_CODE` middleware continues to guard `/api/school/ask`.

## Required files and configuration

- `public/books/grade-4-science.pdf`: original official textbook. Current source: the uploaded user-provided PDF (216 pages, 14.2 MB). Keep the file name stable.
- `public/school/pdf.worker.min.mjs`: generated automatically by `scripts/copy-school-pdf-worker.mjs` during `dev` and `build` from the pinned `pdfjs-dist@4.8.69` package. Do not commit the generated asset.
- Production Vercel: `OPENAI_API_KEY`, `DEFAULT_MODEL=openai:gpt-5.6`, `OPENAI_MODELS=gpt-5.6` (already configured on the project as of 2026-11-15).
- Local development: put `OPENAI_API_KEY` in `.env.local` only. Do not commit credentials.
- Optional: set `SCHOOL_OPENAI_MODEL` to a separate OpenAI model name (such as `gpt-4.1-mini`) to keep classroom assistant usage independent from the general OpenMAIC default model.

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
3. Add low-latency, bidirectional Arabic voice via an ephemeral OpenAI Realtime session (server-issued token; no API key exposed in browser).
4. Add a teacher-managed annotation editor so subsequent book pages/subjects require content mapping rather than code changes.

The book belongs to the project's Git repository for this fixed single-book POC. Future teacher uploads could move to Vercel Blob without changing the PDF viewer's data model.
