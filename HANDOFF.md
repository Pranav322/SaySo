# Sayso — Handoff notes for the next AI

Read this first, then **`AGENTS.md`** (architecture, code map, hard-won gotchas) and **`DEPLOY.md`**
(hosting/ops). This file is the orientation; those two are the detail.

## What Sayso is
A real-time AI **voice conversation** web app for practicing the conversations that make people
nervous — everyday/social ones. You pick a persona (Friend, First Date, New Face, Mentor,
Coworker) or create your own with a **cloned voice**, then talk out loud and it talks back live.

## Status: LIVE and working
- Deployed on DigitalOcean App Platform → https://sayso-tqvrg.ondigitalocean.app (see DEPLOY.md).
- Verified end-to-end in prod: frontend, REST, Postgres, and the conversation WebSocket
  (Qwen streams audio back).

## The stack in one breath
- **Two Qwen models, that's it.** `qwen3.5-omni-plus-realtime` = the whole conversation
  (STT+LLM+TTS in one WebSocket — there is NO separate STT/LLM/TTS; the "LLM" is inside Omni).
  `qwen-voice-enrollment` = one-time HTTP call to clone a voice → returns a `voice_id` reused by Omni.
- Backend: FastAPI WS **relay** (`backend/`) between the browser and Qwen. Postgres for personas.
- Frontend: Next.js 14, warm light/dark theme, the canvas "voiceprint" brand mark + orb.

## Code map (details in AGENTS.md)
- `backend/main.py` — REST + `WS /ws/converse/{id}`; `omni.py` — Qwen client; `store.py` — Postgres
  personas; `enroll.py` — voice cloning; `voices.py` — preset voice list; `limits.py` — abuse caps.
- `frontend/src/` — `app/` pages (`/`, `/app`, `/create`, `/converse/[id]`), `hooks/`
  (useWebSocket/useMicCapture/usePlayback), `components/` (orb, VoiceprintMark, AppNav, etc.).

## Things that will bite you if you don't know them (full list in AGENTS.md)
- **Voice modes:** `ptt` (push-to-talk, DEFAULT, reliable, `turn_detection=None`, hold button/Space
  → release commits) and `hands_free` (semantic_vad + client barge-in, EXPERIMENTAL, flaky on bare
  mic+speaker, needs headphones). Don't "fix" hands-free without understanding the echo loop.
- **Barge-in:** must drop late audio chunks via the `acceptAudioRef` gate, not just flush playback.
- **Enrollment API:** `preferred_name` is REQUIRED; `audio` must be nested `{data: dataURI}`.
- **Omni voice list is undocumented** — the 15 in `voices.py` were found by probing; re-probe with
  `test_voices_audio.py`. Voice samples for the picker live in `frontend/public/voices/*.wav`
  (regen with `gen_voice_samples.py`).
- **Theming:** never hardcode themable hex — use `bg-[var(--token)]` etc. The orb floats freely
  (user removed the dark "stage" wrapper — do NOT re-add it).
- **Privacy:** custom personas are scoped by `session_id` (a localStorage UUID, NOT auth) on list,
  delete, AND the WS. Clearing browser storage loses a user's personas.

## Not built yet (likely next asks)
- Post-conversation **coaching/scoring** (confidence, filler words, pace) — was in the original
  vision, never built.
- Real **accounts/auth** (today it's per-browser session ids). Needed before wide public launch —
  also because one shared `DASHSCOPE_API_KEY` bills for everyone (add an access gate first).
- DB **migrations** tool (schema is created ad hoc by `init_db`).
- Hands-free reliability (real acoustic echo cancellation).

## Conventions (IMPORTANT)
- Git commits are authored as **the user only** — do NOT add yourself as co-author/committer.
- Update `AGENTS.md` after meaningful code changes; update `DEPLOY.md` if anything ops-related changes.
- Use `uv` for Python deps; the repo dir is `mirror/` though the product is "Sayso".
