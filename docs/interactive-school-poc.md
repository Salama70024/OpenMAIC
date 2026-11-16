# Interactive School — grade 4 science POC

The first iteration is available at `/school` and deliberately leaves the existing OpenMAIC classroom unchanged.

## What is implemented

- Arabic, right-to-left teacher interface for Al-Firdaws Virtual School.
- Original Iraqi grade 4 science textbook PDF, rendered page by page in the browser with PDF.js; no modified textbook pages.
- Teacher navigation to book pages 70, 73, 74, 78 and 81.
- Eight clickable hotspots on original diagrams: butterfly life cycle (pages 73–74), frog life cycle (page 81).
- Context popovers with short textbook-grounded descriptions and one-click suggested questions.
- Teacher–assistant chat using the server-held `OPENAI_API_KEY`, with current page and stage injected into a narrow lesson context.
- Experimental browser speech recognition and text-to-speech. **This is not OpenAI Realtime WebRTC yet**; it depends on browser support and installed Arabic voices.
- Existing OpenMAIC site `ACCESS_CODE` middleware continues to guard `/api/school/ask`.

## Required files and configuration

- `public/books/grade-4-science.pdf`: original official textbook. Current source: the uploaded user-provided PDF (216 pages, 14.2 MB). Keep the file name stable.
- `public/school/pdf.worker.min.mjs`: generated automatically by `scripts/copy-school-pdf-worker.mjs` during `dev` and `build` from the pinned `pdfjs-dist@4.8.69` package. Do not commit the generated asset.
- Production Vercel: `OPENAI_API_KEY`, `DEFAULT_MODEL=openai:gpt-5.6`, `OPENAI_MODELS=gpt-5.6` (already configured on the project as of 2026-11-15).
- Local development: put `OPENAI_API_KEY` in `.env.local` only. Do not commit credentials.

## Development and tests

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm dev
# open http://localhost:3000/school
corepack pnpm exec vitest run tests/school/lesson.test.ts
```

## Future milestones

1. Verify the viewer and hotspots on desktop/projector and mobile (original PDF + overlay must stay aligned).
2. Test the grounded assistant with the actual production OpenAI key, logging only nonsensitive errors.
3. Add low-latency, bidirectional Arabic voice via an ephemeral OpenAI Realtime session (server-issued token; no API key exposed in browser).
4. Add a teacher-managed annotation editor so subsequent book pages/subjects require content mapping rather than code changes.

The book belongs to the project's Git repository for this fixed single-book POC. Future teacher uploads could move to Vercel Blob without changing the PDF viewer's data model.
