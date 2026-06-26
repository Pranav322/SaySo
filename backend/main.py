import asyncio
import json
import re
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, UploadFile, File, Form, Header
from fastapi.middleware.cors import CORSMiddleware

from . import store
from .personas import PERSONAS
from .voices import VOICES, VOICE_IDS
from .enroll import enroll_voice
from .omni import OmniSession

load_dotenv()

app = FastAPI(title="Mirror")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup():
    store.init_db()


def resolve_persona(persona_id: str) -> dict | None:
    """Return a persona dict with name/voice/instructions, or None."""
    if persona_id in PERSONAS:
        return PERSONAS[persona_id]
    custom = store.get_persona(persona_id)
    if custom:
        return {
            "name": custom["name"],
            "voice": custom["voice_id"],
            "instructions": custom["instructions"],
        }
    return None


# Max enrollment clip: 10MB (Qwen hard limit). Frontend already trims to ~30s.
MAX_AUDIO_BYTES = 10 * 1024 * 1024


@app.get("/voices")
def list_voices():
    return VOICES


@app.get("/personas")
def list_personas(x_session_id: str = Header(default="")):
    preset = [{"id": k, "name": v["name"], "custom": False} for k, v in PERSONAS.items()]
    custom = [{"id": p["id"], "name": p["name"], "custom": True} for p in store.list_personas(x_session_id)]
    return preset + custom


@app.post("/personas")
async def create_persona(
    name: str = Form(...),
    instructions: str = Form(...),
    audio: UploadFile = File(...),
    x_session_id: str = Header(default=""),
):
    if not x_session_id:
        raise HTTPException(400, "Missing session id.")

    audio_bytes = await audio.read()
    if len(audio_bytes) < 8000:
        raise HTTPException(400, "Audio clip too short. Provide 5–60s of clear speech.")
    if len(audio_bytes) > MAX_AUDIO_BYTES:
        raise HTTPException(400, "Audio clip too large (max 10MB / ~60s).")

    # Qwen preferred_name: lowercase alphanumeric, derived from the persona name
    safe_name = re.sub(r"[^a-z0-9]", "", name.lower()) or "voice"

    try:
        voice_id = await enroll_voice(
            audio_bytes,
            audio.content_type or "audio/wav",
            preferred_name=safe_name[:32],
        )
    except RuntimeError as e:
        raise HTTPException(400, f"Voice enrollment failed: {e}")

    persona_id = store.add_persona(name, instructions, voice_id, x_session_id)
    return {"id": persona_id, "name": name, "custom": True}


@app.delete("/personas/{persona_id}")
def delete_persona(persona_id: str, x_session_id: str = Header(default="")):
    if persona_id in PERSONAS:
        raise HTTPException(400, "Cannot delete a preset persona.")
    if not store.delete_persona(persona_id, x_session_id):
        raise HTTPException(404, "Persona not found.")
    return {"deleted": persona_id}


@app.websocket("/ws/converse/{persona_id}")
async def converse(websocket: WebSocket, persona_id: str, voice: str = "", mode: str = "ptt"):
    persona = resolve_persona(persona_id)
    if persona is None:
        await websocket.close(code=4004, reason="Unknown persona")
        return

    # Allow voice override for PRESET personas only (custom personas keep their clone).
    if voice and voice in VOICE_IDS and persona_id in PERSONAS:
        persona = {**persona, "voice": voice}

    await websocket.accept()

    manual = mode == "ptt"
    async with OmniSession(persona, manual=manual) as session:
        async def receive_from_browser():
            try:
                while True:
                    msg = await websocket.receive()
                    if msg.get("type") == "websocket.disconnect":
                        break
                    if (data := msg.get("bytes")) is not None:
                        await session.send_audio(data)
                    elif (text := msg.get("text")) is not None:
                        evt = json.loads(text)
                        kind = evt.get("type")
                        if kind == "barge_in":
                            await session.cancel_response()
                        elif kind == "commit":
                            await session.commit_and_respond()
            except WebSocketDisconnect:
                pass

        async def send_to_browser():
            try:
                async for kind, payload in session.receive_events():
                    if kind == "audio":
                        await websocket.send_bytes(payload)
                    else:
                        await websocket.send_text(json.dumps({"type": "state", "event": payload}))
            except WebSocketDisconnect:
                pass

        receive_task = asyncio.create_task(receive_from_browser())
        send_task = asyncio.create_task(send_to_browser())

        done, pending = await asyncio.wait(
            [receive_task, send_task],
            return_when=asyncio.FIRST_COMPLETED,
        )
        for task in pending:
            task.cancel()
