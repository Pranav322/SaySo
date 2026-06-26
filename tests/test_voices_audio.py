"""
Generate one spoken reply per voice, hash the audio, and detect distinct voices.
A fake control name ('Zxqfake') reveals the default fallback — any voice whose
audio hashes identically to the control is NOT a real distinct voice.
Usage: uv run python test_voices_audio.py
"""
import asyncio
import base64
import hashlib
import json
import os
import websockets
from dotenv import load_dotenv

load_dotenv()

OMNI_URL = "wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime?model=qwen3.5-omni-plus-realtime"
VOICES = ["Momo", "Moon", "Maia", "Nofish", "Bella", "Jennifer", "Katerina", "Mia", "Sohee", "Eric", "Neil", "Stella", "Cobb", "Jada", "Sunny", "Peter", "Nini", "Bunny"]

# 1s of silence-padded fixed prompt won't drive a turn; instead inject a text item.
PROMPT = "Say exactly: Hello, this is a voice test."


async def gen(voice: str, api_key: str) -> str | None:
    try:
        async with websockets.connect(
            OMNI_URL, additional_headers={"Authorization": f"Bearer {api_key}"}
        ) as ws:
            await ws.send(json.dumps({
                "type": "session.update",
                "session": {
                    "modalities": ["text", "audio"],
                    "voice": voice,
                    "output_audio_format": "pcm",
                },
            }))
            # inject a text user turn, then ask for a response
            await ws.send(json.dumps({
                "type": "conversation.item.create",
                "item": {"type": "message", "role": "user",
                         "content": [{"type": "input_text", "text": PROMPT}]},
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
                        return f"ERROR {ev.get('error', ev)}"
                    elif t == "response.done":
                        break
            if not audio:
                return None
            return hashlib.sha1(b"".join(audio)).hexdigest()[:12]
    except Exception as e:
        return f"exc {e}"


async def main():
    api_key = os.environ["DASHSCOPE_API_KEY"]
    hashes = {}
    for v in VOICES:
        h = await gen(v, api_key)
        hashes[v] = h
        print(f"{v:10} -> {h}")

    control = hashes.get("Zxqfake")
    print(f"\nControl (fake) hash: {control}")
    print("Voices distinct from control (real, usable):")
    for v, h in hashes.items():
        if v == "Zxqfake":
            continue
        tag = "same as fallback" if h == control else "DISTINCT"
        print(f"  {v:10} {tag}")


asyncio.run(main())
