import base64
import logging
import os
import httpx

log = logging.getLogger(__name__)

ENROLL_URL = "https://dashscope-intl.aliyuncs.com/api/v1/services/audio/tts/customization"
TARGET_MODEL = "qwen3.5-omni-plus-realtime"


async def enroll_voice(audio_bytes: bytes, mime: str, preferred_name: str) -> str:
    """Enroll a voice clip with Qwen and return the reusable voice_id.

    Raises RuntimeError with the API message on failure.
    """
    api_key = os.environ["DASHSCOPE_API_KEY"]
    data_uri = f"data:{mime};base64,{base64.b64encode(audio_bytes).decode()}"

    payload = {
        "model": "qwen-voice-enrollment",
        "input": {
            "action": "create",
            "target_model": TARGET_MODEL,
            "preferred_name": preferred_name,
            "audio": {"data": data_uri},
        },
    }

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            ENROLL_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
        )

    body = resp.json()
    voice = body.get("output", {}).get("voice")
    if resp.status_code != 200 or not voice:
        msg = body.get("message", resp.text[:300])
        log.error("Enrollment failed (HTTP %s): %s", resp.status_code, msg)
        raise RuntimeError(msg)

    log.info("Enrolled voice_id=%s", voice)
    return voice
