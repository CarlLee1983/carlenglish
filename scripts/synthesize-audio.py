"""Offline batch synthesis. Runtime readers only receive the generated MP3 files."""
import hashlib
import importlib.metadata
import json
from pathlib import Path
import shutil
import subprocess
import sys

import numpy as np
import soundfile as sf
import torch
from kokoro import KModel, KPipeline

input_path, model_dir, output = map(Path, sys.argv[1:])
batch = json.loads(input_path.read_text())
profile = batch["profile"]
if importlib.metadata.version("kokoro") != profile["libraryVersion"]:
    raise RuntimeError("Kokoro version differs from voice profile")
if profile["voice"] != "af_heart" or profile["sampleRate"] != 24000:
    raise RuntimeError("This generator supports the accepted af_heart 24 kHz voice only")
for path, expected in [
    (model_dir / "kokoro-v1_0.pth", profile["modelSha256"]),
    (model_dir / "voices/af_heart.pt", profile["voiceSha256"]),
    (model_dir / "config.json", "5abb01e2403b072bf03d04fde160443e209d7a0dad49a423be15196b9b43c17f"),
]:
    if hashlib.sha256(path.read_bytes()).hexdigest() != expected:
        raise RuntimeError(f"Unverified model asset: {path.name}")
ffmpeg = shutil.which("ffmpeg")
if not ffmpeg:
    raise RuntimeError("FFmpeg is required")
torch.set_num_threads(2)
torch.manual_seed(0)
model = KModel(repo_id="hexgrad/Kokoro-82M", config=str(model_dir / "config.json"), model=str(model_dir / "kokoro-v1_0.pth")).to("cpu").eval()
pipeline = KPipeline(lang_code="a", repo_id="hexgrad/Kokoro-82M", model=model)
voice = torch.load(model_dir / "voices/af_heart.pt", map_location="cpu", weights_only=True)
manifest = {"profile": profile, "clips": []}
for clip in batch["clips"]:
    if hashlib.sha256(clip["text"].encode("utf-8")).hexdigest() != clip["textSha256"]:
        raise RuntimeError("Input text hash mismatch")
    chunks = list(pipeline(clip["text"], voice=voice, speed=profile["speed"]))
    if not chunks or any(chunk.audio is None for chunk in chunks):
        raise RuntimeError("Missing synthesized audio")
    # Chunking may change boundary whitespace, but must retain every visible character.
    if "".join("".join(chunk.graphemes.split()) for chunk in chunks) != "".join(clip["text"].split()):
        raise RuntimeError("Synthesizer did not consume the complete English text")
    samples = np.concatenate([chunk.audio.numpy() for chunk in chunks])
    target = (output / clip["src"].lstrip("/")).resolve()
    if not target.is_relative_to(output.resolve()) or target.suffix != ".mp3":
        raise RuntimeError("Invalid output path")
    target.parent.mkdir(parents=True, exist_ok=True)
    wav = target.with_suffix(".wav")
    sf.write(wav, samples, profile["sampleRate"])
    subprocess.run([ffmpeg, "-v", "error", "-y", "-i", str(wav), "-codec:a", "libmp3lame", "-q:a", "2", str(target)], check=True)
    manifest["clips"].append({
        **clip, "voiceId": profile["id"], "sha256": hashlib.sha256(target.read_bytes()).hexdigest(),
        "duration": len(samples) / profile["sampleRate"],
        "graphemes": [chunk.graphemes for chunk in chunks], "phonemes": [chunk.phonemes for chunk in chunks],
    })
    print(f"Ready {clip['src']}: {len(samples) / profile['sampleRate']:.2f}s", flush=True)
(output / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
