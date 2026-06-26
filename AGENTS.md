# Mirror — Agent Notes

Real-time AI voice conversation app for practicing difficult conversations (CEO, CTO,
interviewer, custom personas). Built on Qwen's `qwen3.5-omni-plus-realtime` speech-to-speech model.

## Architecture

```
Browser (mic PCM 16kHz)  ──WS──▶  FastAPI relay  ──WS──▶  Qwen Omni S2S
Browser (speaker PCM 24kHz) ◀──WS──  FastAPI relay ◀──WS──  Qwen Omni S2S
```

- **One model does everything**: `qwen3.5-omni-plus-realtime` handles STT + LLM + TTS in a
  single WebSocket. There is no separate STT/LLM/TTS — that's why latency is low.
- FastAPI is a pure relay: bridges browser binary PCM frames ↔ Qwen JSON+base64 protocol.

## Backend (`backend/`, run with uv)

- `main.py` — FastAPI: `GET/POST/DELETE /personas`, `WS /ws/converse/{persona_id}`
- `omni.py` — `OmniSession`: WS client to Qwen. Takes a persona dict `{name, voice, instructions}`.
- `personas.py` — 5 hardcoded preset personas (voice = preset name like "Tina")
- `store.py` — SQLite (`personas.db`) for user-created custom personas
- `enroll.py` — voice cloning via Qwen enrollment HTTP API

Run: `cd backend && PYTHONPATH=.. uv run uvicorn backend.main:app --reload` (from project root: `PYTHONPATH=. uv run uvicorn backend.main:app --reload`)

## Frontend (`frontend/`, Next.js 14 + Tailwind)

- `/` persona picker · `/create` make custom persona · `/converse/[id]` live conversation
- `public/worklets/mic-processor.js` — AudioWorklet, downsamples mic to 16kHz Int16 (plain JS, no imports)
- `hooks/`: `useMicCapture` (mic→worklet, `start(nativeRate?)`), `useWebSocket`, `usePlayback` (gapless jitter queue)
- `lib/wavEncoder.ts` — Int16 chunks → WAV blob (for recorded enrollment clips)

Run: `cd frontend && npm run dev`

## Voice cloning (KEY FACTS — verified working)

- A cloned `voice_id` works **directly** in the Omni session — just pass it as the session
  `voice` field. No separate TTS pipeline. `omni.py` needs zero changes for custom personas.
- Enrollment is ONE synchronous HTTP call, returns a reusable `voice_id`:
  - `POST https://dashscope-intl.aliyuncs.com/api/v1/services/audio/tts/customization`
  - body: `{model:"qwen-voice-enrollment", input:{action:"create", target_model:"qwen3.5-omni-plus-realtime", preferred_name:<slug>, audio:{data:"data:<mime>;base64,<...>"}}}`
  - **Gotchas**: `preferred_name` is REQUIRED (lowercase alphanumeric); `audio` must be a nested
    object `{data: <dataURI>}`, NOT a flat string; response voice_id at `output.voice`.
- No transcript needed for Qwen enrollment (unlike the local mlx-audio path).

## Personas: instructions, clip limits, session scoping

- **Instructions DO work** — the Omni `instructions` field steers persona behavior well, but
  needs forceful wording. "Be rude, interrupt, mock me" → genuinely rude; "be a bit tough" → mild.
  Verified via `INSTRUCT="..." uv run python test_omni_direct.py`.
- **Voice clip limits** (Qwen enrollment): 10–20s ideal, 60s / 10MB hard max. Frontend trims BOTH
  recordings (auto-stop at 30s) and uploads (`lib/audioTrim.ts` decodes any format → mono WAV,
  first 30s) so a user can't submit an hour-long podcast. Backend also rejects >10MB.
- **Custom personas are per browser session, NOT global.** Frontend generates a UUID in
  localStorage (`lib/session.ts`) and sends it as `X-Session-Id` on every persona request.
  Backend scopes `list`/`delete` by `session_id` (column on the personas table). Presets are
  global. The WS `/converse/{id}` looks up by id alone (you already hold the id).

## Voices (preset, for Omni realtime)

- Qwen does NOT document the Omni realtime voice list (only "Tina" in docs). The 15 working
  voices in `backend/voices.py` were found by PROBING: `session.update` accepts any string, but
  synthesis errors `Voice 'X' is not supported` for invalid ones. Re-probe with `test_voices_audio.py`.
- Confirmed working: Ethan, Ryan, Dylan, Aiden, Eric, Peter (male-ish); Tina, Serena, Momo, Maia,
  Jennifer, Katerina, Mia, Sohee, Sunny (female-ish). Gender labels are best-guess, not from docs.
- Preset personas have distinct default voices (CEO=Ethan, CTO=Ryan, etc.) — NOT all Tina.
- `GET /voices` serves the list. Conversation screen shows a voice picker for PRESET personas;
  the chosen voice is passed as `?voice=` on the WS and overrides the persona default in `main.py`.
  Custom personas IGNORE the override (they use their cloned voice).

## Turn-state UX + barge-in (Phase 4)

- The WS now carries TWO frame types: **binary** = audio PCM; **text** = control state
  `{"type":"state","event":"<qwen event>"}`. `omni.py:receive_events()` yields tagged tuples
  `("audio", bytes)` / `("event", type)`; `main.py` forwards them as bytes / text respectively.
- Forwarded events drive the frontend phase machine: `speech_started`→listening,
  `speech_stopped`/`response.created`→thinking, first audio→speaking, `response.done`/
  `response.audio.done`→listening.
- **Barge-in**: client-side VAD (mic RMS > `VAD_LEVEL` in the converse page) while phase==speaking
  → `usePlayback.flush()` (stops/clears scheduled audio, keeps ctx open) + WS text
  `{"type":"barge_in"}` → backend calls `session.cancel_response()` (`{"type":"response.cancel"}`).
  Browser→backend now uses `websocket.receive()` and branches bytes vs text.
- **Echo**: assumes HEADPHONES (no AEC). On speakers the AI interrupts itself. Future: energy gating / AEC.
- **Two modes** (chosen on idle screen, sent as WS `?mode=`):
  - `ptt` (push-to-talk, DEFAULT, reliable): backend uses `turn_detection=None`. Frontend only
    streams mic audio while the talk button / Spacebar is held; on release sends WS `{"type":"commit"}`
    → backend `session.commit_and_respond()` (`input_audio_buffer.commit` + `response.create`).
    No semantic_vad guessing, no false barge-in, works on speakers. Phase `ready` = waiting for press.
  - `hands_free` (experimental): `semantic_vad` + client-VAD barge-in (the Phase-4 behavior). Flaky
    on bare mic+speaker because VAD must GUESS turn boundaries; needs headphones.
- Why hands-free is flaky even with headphones: semantic_vad guesses when you finished (misses pauses/
  soft speech → no reply) and any noise during AI speech can trip client-VAD → false `response.cancel`.
  ptt removes the guessing entirely.
- **Orb** (`components/ui/voice-powered-orb.tsx`, ogl/WebGL): prop-driven — `state` + `getLevel()`.
  It NEVER opens its own mic (the supplied version did; that was stripped). `getLevel` returns
  mic level when listening, `usePlayback.getLevel()` (AnalyserNode RMS) when speaking. Needs `ogl`
  + `lib/utils.ts` `cn()`. `ConversationControls.tsx` is now unused (controls inlined in the page).

## Key protocol facts

- Qwen `response.audio.delta` event: audio base64 is at `event["delta"]` (a STRING, not `delta.audio`).
- Omni needs trailing silence to trigger end-of-turn VAD when feeding a fixed clip (real mic streams silence naturally).
- Audio: browser→Qwen 16kHz PCM, Qwen→browser 24kHz PCM, both 16-bit mono.

## Test scripts (de-risk before wiring)

- `test_omni_direct.py <wav>` — direct Qwen Omni test, bypasses FastAPI. `TEST_VOICE=<voice_id>` to test a clone.
- `test_enroll.py <audio>` — enroll a voice, print voice_id.
- `test_ws.py <persona> <wav>` — test through the FastAPI relay.

## Env

- `.env` holds `DASHSCOPE_API_KEY` (qwencloud = DashScope; uses `dashscope-intl` endpoint).
