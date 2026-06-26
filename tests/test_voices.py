"""
Probe which preset voice names qwen3.5-omni-plus-realtime accepts.
Sends session.update per candidate, checks for an error event.
Usage: uv run python test_voices.py
"""
import asyncio
import json
import os
import websockets
from dotenv import load_dotenv

load_dotenv()

OMNI_URL = "wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime?model=qwen3.5-omni-plus-realtime"

CANDIDATES = [
    "Tina", "Cherry", "Serena", "Ethan", "Chelsie", "Momo", "Vivian", "Moon",
    "Maia", "Kai", "Nofish", "Bella", "Jennifer", "Ryan", "Katerina", "Aiden",
    "Mia", "Vincent", "Sohee", "Dylan", "Eric", "Neil", "Stella", "Cobb",
]


async def probe(voice: str, api_key: str) -> str:
    try:
        async with websockets.connect(
            OMNI_URL, additional_headers={"Authorization": f"Bearer {api_key}"}
        ) as ws:
            await ws.send(json.dumps({
                "type": "session.update",
                "session": {
                    "modalities": ["text", "audio"],
                    "voice": voice,
                    "input_audio_format": "pcm",
                    "output_audio_format": "pcm",
                    "turn_detection": {"type": "semantic_vad"},
                },
            }))
            async with asyncio.timeout(8):
                async for raw in ws:
                    ev = json.loads(raw)
                    t = ev.get("type", "")
                    if t == "session.updated":
                        return "OK"
                    if t == "error":
                        return f"REJECTED: {ev.get('error', ev)}"
            return "no response"
    except Exception as e:
        return f"conn error: {e}"


async def main():
    api_key = os.environ["DASHSCOPE_API_KEY"]
    for v in CANDIDATES:
        result = await probe(v, api_key)
        mark = "✅" if result == "OK" else "❌"
        print(f"{mark} {v:12} {result if result != 'OK' else ''}")


asyncio.run(main())
