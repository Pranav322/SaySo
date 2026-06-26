"""
Standalone test for Qwen voice enrollment — de-risks the cloning feature.
Usage: uv run python test_enroll.py <audio.wav|mp3|m4a>
Prints the voice_id on success.
"""
import asyncio
import base64
import mimetypes
import os
import sys
import json
import httpx
from dotenv import load_dotenv

load_dotenv()

ENROLL_URL = "https://dashscope-intl.aliyuncs.com/api/v1/services/audio/tts/customization"
TARGET_MODEL = "qwen3.5-omni-plus-realtime"

AUDIO_PATH = sys.argv[1] if len(sys.argv) > 1 else "../qwen3-tts/reference.wav"


async def main():
    api_key = os.environ.get("DASHSCOPE_API_KEY", "")
    if not api_key:
        print("ERROR: DASHSCOPE_API_KEY not set")
        return

    with open(AUDIO_PATH, "rb") as f:
        audio_bytes = f.read()

    mime = mimetypes.guess_type(AUDIO_PATH)[0] or "audio/wav"
    data_uri = f"data:{mime};base64,{base64.b64encode(audio_bytes).decode()}"
    print(f"Audio: {AUDIO_PATH} ({len(audio_bytes)} bytes, {mime})")

    payload = {
        "model": "qwen-voice-enrollment",
        "input": {
            "action": "create",
            "target_model": TARGET_MODEL,
            "preferred_name": "mirrortest",
            "audio": {"data": data_uri},
        },
    }

    print(f"POST {ENROLL_URL} (target_model={TARGET_MODEL})...")
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            ENROLL_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
        )

    print(f"HTTP {resp.status_code}")
    try:
        body = resp.json()
    except Exception:
        print("Non-JSON response:", resp.text[:500])
        return

    print(json.dumps(body, indent=2)[:1500])

    voice = body.get("output", {}).get("voice")
    if voice:
        print(f"\n✅ voice_id = {voice}")
    else:
        print("\n❌ No voice_id in 'output.voice' — inspect response above for the real path.")


asyncio.run(main())
