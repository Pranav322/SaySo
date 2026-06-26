"""
Direct Qwen Omni WebSocket test — bypasses FastAPI entirely.
Connects straight to Qwen, sends audio, prints every event received.
Usage: uv run python test_omni_direct.py [input.wav]
"""
import asyncio
import audioop
import base64
import json
import os
import sys
import wave
from dotenv import load_dotenv
import websockets

load_dotenv()

OMNI_URL = "wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime?model=qwen3.5-omni-plus-realtime"
INPUT_WAV = sys.argv[1] if len(sys.argv) > 1 else None


def load_and_convert_wav(path: str) -> bytes:
    with wave.open(path, "rb") as f:
        src_rate = f.getframerate()
        src_width = f.getsampwidth()
        channels = f.getnchannels()
        raw = f.readframes(f.getnframes())
    if channels == 2:
        raw = audioop.tomono(raw, src_width, 0.5, 0.5)
    if src_width != 2:
        raw = audioop.lin2lin(raw, src_width, 2)
    if src_rate != 16000:
        raw, _ = audioop.ratecv(raw, 2, 1, src_rate, 16000, None)
    return raw


def make_silence(seconds=2) -> bytes:
    return b"\x00\x00" * (16000 * seconds)


async def main():
    api_key = os.environ.get("DASHSCOPE_API_KEY", "")
    if not api_key:
        print("ERROR: DASHSCOPE_API_KEY not set")
        return

    print(f"API key: {api_key[:12]}...")
    print(f"Connecting to Qwen Omni...")

    try:
        async with asyncio.timeout(10):
            ws = await websockets.connect(
                OMNI_URL,
                additional_headers={"Authorization": f"Bearer {api_key}"},
            )
    except asyncio.TimeoutError:
        print("FAILED: Connection timed out after 10s — URL wrong or unreachable")
        return
    except Exception as e:
        print(f"FAILED: Connection error: {e}")
        return

    print("Connected! Sending session.update...")

    voice = os.environ.get("TEST_VOICE", "Tina")
    instructions = os.environ.get("INSTRUCT", "You are a CEO. Be brief.")
    print(f"Using voice: {voice}")
    print(f"Instructions: {instructions}")
    await ws.send(json.dumps({
        "type": "session.update",
        "session": {
            "modalities": ["text", "audio"],
            "voice": voice,
            "instructions": instructions,
            "input_audio_format": "pcm",
            "output_audio_format": "pcm",
            "turn_detection": {"type": "semantic_vad"},
        },
    }))

    # wait for session.updated confirmation
    try:
        async with asyncio.timeout(5):
            msg = await ws.recv()
            event = json.loads(msg)
            print(f"Got event: {event.get('type')} — {json.dumps(event)[:200]}")
    except asyncio.TimeoutError:
        print("FAILED: No session.updated response within 5s")
        await ws.close()
        return

    # send audio
    pcm = load_and_convert_wav(INPUT_WAV) if INPUT_WAV else make_silence(2)
    print(f"\nSending {len(pcm)} bytes of audio in chunks...")
    chunk_size = 3200
    for i in range(0, len(pcm), chunk_size):
        await ws.send(json.dumps({
            "type": "input_audio_buffer.append",
            "audio": base64.b64encode(pcm[i:i+chunk_size]).decode(),
        }))
        await asyncio.sleep(0.1)

    # send 1.5s of silence so VAD detects end of speech
    silence = b"\x00\x00" * (16000 * 2)
    for i in range(0, len(silence), chunk_size):
        await ws.send(json.dumps({
            "type": "input_audio_buffer.append",
            "audio": base64.b64encode(silence[i:i+chunk_size]).decode(),
        }))
        await asyncio.sleep(0.1)
    print("Audio + silence sent. Listening for events (15s)...")

    received_audio = []
    transcript = []
    try:
        async with asyncio.timeout(15):
            async for raw in ws:
                event = json.loads(raw)
                etype = event.get("type", "")
                if etype == "response.audio.delta":
                    chunk = base64.b64decode(event.get("delta", ""))
                    received_audio.append(chunk)
                elif etype == "response.audio_transcript.delta":
                    transcript.append(event.get("delta", ""))
                elif etype not in ("conversation.item.input_audio_transcription.delta",):
                    print(f"  event: {etype}")
                if etype == "response.done":
                    break
    except asyncio.TimeoutError:
        print("Timeout (15s) — no response.done received")

    if transcript:
        print(f"\n🗣️  AI said: {''.join(transcript)}")

    await ws.close()

    if received_audio:
        out = b"".join(received_audio)
        with wave.open("test_omni_direct.wav", "wb") as f:
            f.setnchannels(1)
            f.setsampwidth(2)
            f.setframerate(24000)
            f.writeframes(out)
        print(f"\nSaved {len(out)} bytes → test_omni_direct.wav")
        print("Play with: afplay test_omni_direct.wav")
    else:
        print("\nNo audio received.")


asyncio.run(main())
