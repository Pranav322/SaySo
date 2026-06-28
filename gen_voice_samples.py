"""
Generate a short preview clip for each preset voice and save to
frontend/public/voices/<id>.wav  (mono 16-bit 24kHz).
Run once: uv run python gen_voice_samples.py
"""
import asyncio
import base64
import json
import os
import wave
import websockets
from dotenv import load_dotenv

from backend.voices import VOICES

load_dotenv()

OMNI_URL = "wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime?model=qwen3.5-omni-plus-realtime"
OUT_DIR = os.path.join("frontend", "public", "voices")
PHRASE = "Hey there! This is how I sound. Nice to meet you."


def save_wav(pcm: bytes, path: str):
    with wave.open(path, "wb") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(24000)
        f.writeframes(pcm)


async def gen(voice: str, api_key: str) -> bytes | None:
    async with websockets.connect(
        OMNI_URL, additional_headers={"Authorization": f"Bearer {api_key}"}
    ) as ws:
        await ws.send(json.dumps({
            "type": "session.update",
            "session": {
                "modalities": ["text", "audio"],
                "voice": voice,
                "instructions": f"Say exactly this and nothing else: '{PHRASE}'",
                "output_audio_format": "pcm",
            },
        }))
        await ws.send(json.dumps({
            "type": "conversation.item.create",
            "item": {"type": "message", "role": "user",
                     "content": [{"type": "input_text", "text": f"Say: {PHRASE}"}]},
        }))
        await ws.send(json.dumps({"type": "response.create"}))

        audio = []
        async with asyncio.timeout(20):
            async for raw in ws:
                ev = json.loads(raw)
                t = ev.get("type", "")
                if t == "response.audio.delta":
                    audio.append(base64.b64decode(ev.get("delta", "")))
                elif t == "error":
                    print(f"  ERROR {voice}: {ev.get('error', ev)}")
                    return None
                elif t == "response.done":
                    break
        return b"".join(audio) or None


async def main():
    api_key = os.environ["DASHSCOPE_API_KEY"]
    os.makedirs(OUT_DIR, exist_ok=True)
    for v in VOICES:
        vid = v["id"]
        pcm = await gen(vid, api_key)
        if pcm:
            save_wav(pcm, os.path.join(OUT_DIR, f"{vid}.wav"))
            print(f"✓ {vid:10} {len(pcm)} bytes")
        else:
            print(f"✗ {vid:10} no audio")


asyncio.run(main())
