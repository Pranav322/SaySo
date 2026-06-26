import asyncio
import base64
import json
import logging
import os
import websockets

log = logging.getLogger(__name__)

OMNI_URL = "wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime?model=qwen3.5-omni-plus-realtime"


class OmniSession:
    def __init__(self, persona: dict, manual: bool = False):
        self.persona = persona
        self.manual = manual  # push-to-talk: client controls commit + response
        self._ws = None
        self._audio_queue: asyncio.Queue[bytes | None] = asyncio.Queue()

    async def __aenter__(self):
        api_key = os.environ["DASHSCOPE_API_KEY"]
        log.info("Connecting to Omni at %s", OMNI_URL)
        self._ws = await websockets.connect(
            OMNI_URL,
            additional_headers={"Authorization": f"Bearer {api_key}"},
        )
        log.info("Connected. Sending session.update for persona '%s'", self.persona["name"])
        await self._send_session_update()
        return self

    async def __aexit__(self, *_):
        if self._ws:
            await self._ws.close()

    async def _send_session_update(self):
        # manual (push-to-talk): turn_detection=None, client sends commit + response.create.
        # hands-free: semantic_vad auto-detects turn boundaries.
        turn_detection = None if self.manual else {"type": "semantic_vad"}
        await self._ws.send(json.dumps({
            "type": "session.update",
            "session": {
                "modalities": ["text", "audio"],
                "voice": self.persona["voice"],
                "instructions": self.persona["instructions"],
                "input_audio_format": "pcm",
                "output_audio_format": "pcm",
                "turn_detection": turn_detection,
            },
        }))

    async def commit_and_respond(self):
        """Push-to-talk: commit the buffered audio and ask for a reply."""
        await self._ws.send(json.dumps({"type": "input_audio_buffer.commit"}))
        await self._ws.send(json.dumps({"type": "response.create"}))

    async def send_audio(self, pcm_bytes: bytes):
        await self._ws.send(json.dumps({
            "type": "input_audio_buffer.append",
            "audio": base64.b64encode(pcm_bytes).decode(),
        }))

    async def cancel_response(self):
        """Stop the AI's current reply (barge-in)."""
        await self._ws.send(json.dumps({"type": "response.cancel"}))

    # Control events the frontend needs to drive turn-state UX.
    _FORWARDED_EVENTS = {
        "input_audio_buffer.speech_started",
        "input_audio_buffer.speech_stopped",
        "response.created",
        "response.done",
        "response.audio.done",
    }

    async def receive_events(self):
        """Yields ('audio', bytes) for audio chunks and ('event', type) for turn-state events."""
        async for message in self._ws:
            event = json.loads(message)
            event_type = event.get("type", "")
            log.debug("Omni event: %s", event_type)

            if event_type == "response.audio.delta":
                audio_b64 = event.get("delta", "")
                if audio_b64:
                    yield ("audio", base64.b64decode(audio_b64))

            elif event_type in self._FORWARDED_EVENTS:
                yield ("event", event_type)

            elif event_type == "error":
                log.error("Omni error event: %s", event)
                raise RuntimeError(f"Omni error: {event}")
