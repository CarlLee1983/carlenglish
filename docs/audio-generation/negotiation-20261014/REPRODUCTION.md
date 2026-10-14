# New-scene audio production record

This batch contains 39 synthetic clips for the original CarlEnglish scenes `returning-faulty-headphones`, `rearranging-a-booking`, and `agreeing-on-a-shared-budget`: 3 complete stories, 15 phrases, and 21 words. It does not change the 516 pre-existing production clips.

## Contract and sources

- Engine: Kokoro 0.9.4, official PyPI release https://pypi.org/project/kokoro/0.9.4/ . Wheel SHA-256: `a129dc6364a286bd6a92c396e9862459d3d3e45f2c15596ed5a94dcee5789efd`.
- Model: https://huggingface.co/hexgrad/Kokoro-82M/tree/f3ff3571791e39611d31c381e3a41a3af07b4987 . Revision: `f3ff3571791e39611d31c381e3a41a3af07b4987`.
- Model SHA-256: `496dba118d1a58f5f3db2efc88dbdc216e0483fc89fe6e47ee1f2c53f18ad1e4`.
- Voice: `af_heart`. Voice SHA-256: `0ab5709b8ffab19bfd849cd11d98f75b60af7733253ad0d67b12382a102cb4ff`.
- Config SHA-256: `5abb01e2403b072bf03d04fde160443e209d7a0dad49a423be15196b9b43c17f`.
- Model license: upstream metadata says Apache-2.0, https://www.apache.org/licenses/LICENSE-2.0 . This model license does not automatically become the license of generated MP3 files.
- English G2P model: official Explosion `en_core_web_sm` 3.8.0, https://github.com/explosion/spacy-models/releases/tag/en_core_web_sm-3.8.0 . MIT; wheel SHA-256 `1932429db727d4bff3deed6b34cfc05df17794f4a52eeb26cf8928f7c1a0fb85` verified against its published release checksum.

`model-assets.json` and `spacy-model.json` contain exact pinned download URLs and verification data. No model binaries or Python environment belong in the website repository.

## Runtime and encoding

Python 3.12.14; Kokoro 0.9.4; Misaki 0.9.4; Torch 2.8.0+cpu; Transformers 4.51.3; NumPy 2.2.6; SoundFile 0.13.1; spaCy 3.8.7; en_core_web_sm 3.8.0; espeakng-loader 0.2.4; phonemizer-fork 3.3.2; Hugging Face Hub 0.30.2. Typer and typer-slim are pinned to 0.16.0 with Click 8.2.1 for the spaCy CLI import. Full restored package versions are in `requirements.freeze.txt`.

Synthesis is CPU-only, speed 1, 24,000 Hz, 2 Torch threads, manual seed 0. The repository's unchanged `scripts/synthesize-audio.py` writes WAV and encodes MP3 using FFmpeg 7.1.5 / `libmp3lame -q:a 2`. The configuration is the existing `content/audio/voice-profile.json`; the generator/profile hashes are in `generator-sources.json`.

This environment matches the prior batch's pinned dependency versions and the published engine/model/voice contract. Reproducibility records describe this batch; they do not promise byte-identical reproduction of older MP3 assets.

## Generation command

From the CarlEnglish repository root, with the isolated generation environment prepared alongside the repository:

```sh
AUDIO_ENV=/tmp/carlenglish-next-audio
BATCH=docs/audio-generation/negotiation-20261014
OUTPUT="$AUDIO_ENV/negotiation-output"
HF_HUB_OFFLINE=1 HF_HUB_DISABLE_IMPLICIT_TOKEN=1 TRANSFORMERS_OFFLINE=1 \
HF_HOME="$AUDIO_ENV/hf-cache" \
"$AUDIO_ENV/venv/bin/python" scripts/synthesize-audio.py \
  "$BATCH/inputs.json" "$AUDIO_ENV/model" "$OUTPUT"
```

The inputs are the reviewed frozen text, not scraped text. Story text follows the existing `canonicalStoryText` contract: original segment strings joined within each sentence, then exactly one space between sentences. The batch is limited to these 39 new clip paths. Use a new scratch output directory when regenerating; do not run the unfiltered generator against existing production clips.

## Verification and listening status

`manifest.json` records each exact input string, its UTF-8 SHA-256, complete grapheme/phoneme chunks, output MP3 SHA-256, voice ID, and generated duration. `validation.json` records independent FFmpeg decode, 24 kHz mono PCM checks, finite/non-silent samples, input-consumption verification, source draft hashes, and confirmation that the 516 pre-existing clip hashes were unchanged.

The 39 new clips still require human listening and acceptance. Text hashes, successful decoding, complete grapheme consumption, and non-silent waveforms do not establish correct pronunciation or subjective audio quality.

The frozen requirements record the restored environment. Install the pinned CPU-only Torch wheel from the official PyTorch CPU index (`https://download.pytorch.org/whl/cpu`) when recreating it; do not silently substitute a CUDA build. The spaCy model entry uses its verified official release URL rather than a machine-local wheel path. `frozen-sources.json` records the reviewed draft JSONs before audio hashes were added; canonical audio text hashes in the final scene files and manifest are the final reproducibility boundary.

All 39 clips were newly synthesized; no prior audio clips were reused. `verified-sources.json` records the downloaded official model and spaCy assets. The Kokoro wheel SHA-256 was independently checked before synthesis. Model and pipeline initialization and generation ran offline with an isolated Hugging Face home and implicit token use disabled.
