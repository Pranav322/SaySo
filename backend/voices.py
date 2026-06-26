# Preset voices confirmed working with qwen3.5-omni-plus-realtime (probed empirically;
# the Omni voice list is undocumented). gender is a best-guess label for the picker UI.
VOICES = [
    {"id": "Ethan",    "gender": "male"},
    {"id": "Ryan",     "gender": "male"},
    {"id": "Dylan",    "gender": "male"},
    {"id": "Aiden",    "gender": "male"},
    {"id": "Eric",     "gender": "male"},
    {"id": "Peter",    "gender": "male"},
    {"id": "Tina",     "gender": "female"},
    {"id": "Serena",   "gender": "female"},
    {"id": "Momo",     "gender": "female"},
    {"id": "Maia",     "gender": "female"},
    {"id": "Jennifer", "gender": "female"},
    {"id": "Katerina", "gender": "female"},
    {"id": "Mia",      "gender": "female"},
    {"id": "Sohee",    "gender": "female"},
    {"id": "Sunny",    "gender": "female"},
]

VOICE_IDS = {v["id"] for v in VOICES}
