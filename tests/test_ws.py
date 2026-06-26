"""
Quick test: connects to the converse WS, sends a WAV as PCM, saves the response.
Usage: uv run python test_ws.py <persona_id> <input.wav>
"""
import asyncio
import audioop
import sys
import wave
import websockets

PERSONA = sys.argv[1] if len(sys.argv) > 1 else "ceo"
INPUT_WAV = sys.argv[2] if len(sys.argv) > 2 else None
OUTPUT_WAV = "test_response.wav"
SERVER = "ws://localhost:8000"

TARGET_RATE = 16000
TARGET_WIDTH = 2  # 16-bit


def load_and_convert_wav(path: str) -> bytes:
    with wave.open(path, "rb") as f:
        src_rate = f.getframerate()
        src_width = f.getsampwidth()
        channels = f.getnchannels()
        raw = f.readframes(f.getnframes())

    # mix down to mono
    if channels == 2:
        raw = audioop.tomono(raw, src_width, 0.5, 0.5)

    # convert sample width to 16-bit
    if src_width != TARGET_WIDTH:
        raw = audioop.lin2lin(raw, src_width, TARGET_WIDTH)

    # resample to 16kHz
    if src_rate != TARGET_RATE:
        raw, _ = audioop.ratecv(raw, TARGET_WIDTH, 1, src_rate, TARGET_RATE, None)

    print(f"  converted: {src_rate}Hz {src_width*8}bit → {TARGET_RATE}Hz 16bit ({len(raw)} bytes)")
    return raw


def make_silence_pcm(seconds: int = 3) -> bytes:
    return b"\x00\x00" * (TARGET_RATE * seconds)


def save_pcm_as_wav(pcm: bytes, path: str):
    with wave.open(path, "wb") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(24000)
        f.writeframes(pcm)


async def main():
    if INPUT_WAV:
        print(f"Loading {INPUT_WAV} ...")
        pcm_in = load_and_convert_wav(INPUT_WAV)
    else:
        print("No input file — using 3s silence")
        pcm_in = make_silence_pcm()

    print(f"Connecting to {SERVER}/ws/converse/{PERSONA} ...")
    response_chunks = []

    async with websockets.connect(f"{SERVER}/ws/converse/{PERSONA}") as ws:
        # send at real-time speed: 100ms chunks = 3200 bytes at 16kHz 16-bit mono
        chunk_size = 3200
        total = len(pcm_in)
        for i in range(0, total, chunk_size):
            await ws.send(pcm_in[i:i + chunk_size])
            await asyncio.sleep(0.1)
        print(f"Sent {total} bytes. Waiting for response (10s) ...")

        try:
            async with asyncio.timeout(10):
                async for msg in ws:
                    if isinstance(msg, bytes) and msg:
                        response_chunks.append(msg)
                        print(f"  received chunk: {len(msg)} bytes")
        except asyncio.TimeoutError:
            print("Timeout reached.")

    if response_chunks:
        pcm_out = b"".join(response_chunks)
        save_pcm_as_wav(pcm_out, OUTPUT_WAV)
        print(f"\nSaved {len(pcm_out)} bytes → {OUTPUT_WAV}")
        print("Play with: afplay test_response.wav")
    else:
        print("No audio received — check server logs for errors.")


asyncio.run(main())
