# Firdous Interactive Science — Standalone Pilot

This is the school-only extraction of the existing OpenMAIC proof of concept.
It keeps the original fourth-grade science book, interactive butterfly activity,
guided teaching interface, contextual Q&A, speech narration, and live conversation.

It **does not** depend on OpenMAIC's presentation editor, workbench, agent runner,
database, generation pipeline, or global providers.

```bash
npm install
npm run dev
```

Open `http://localhost:3000/school` (the root URL redirects there).

For server-side AI routes, configure `OPENAI_API_KEY` in the deployment environment.
Optionally set `SCHOOL_OPENAI_MODEL`, `SCHOOL_REALTIME_MODEL`, and `SCHOOL_TTS_MODEL`.
No API keys are included in the repository or browser code.

The build prepares the original PDF as a text asset and copies the matching
PDF.js worker, retaining consistent rendering of Arabic letter forms.

The pilot is intended for a limited teacher review. Before unrestricted public
access, add per-user authorization and usage budgets for the billable AI APIs.

The canonical feature implementation currently remains in `app/school`,
`app/api/school`, and `lib/school` at the repository root; synchronize relevant
changes into this standalone project when updating the school experience.
