# Sentence reading audio

All sentence text comes directly from `segments.map(segment => segment.text).join('')`, without trimming or whitespace normalization. The accepted `content/audio/voice-profile.json` pins Kokoro `af_heart`, model and voice hashes, library version, speed, and sample rate. The existing offline `scripts/synthesize-audio.py` checks those local assets and verifies that synthesis consumed every visible character.

Generate or maintain the batch without downloads or dependency installation:

```sh
node scripts/generate-sentence-audio.mjs <isolated-python> <local-model-directory>
```

Append scene IDs to generate a representative subset. Paths are deterministic: `/audio/sentences/<scene-id>/<one-based-sentence-number>.mp3`. This generator changes only sentence clips and sentence audio metadata. Existing phrase and word clips remain unchanged. Superseded whole-story clips and their runtime metadata have been removed; historical generation manifests remain as provenance.

`inputs.json` records the latest requested batch. `manifest.json` records generated text, text and audio hashes, voice profile, duration, consumed graphemes, and phonemes; subset runs retain other recorded clips. The generator reuses a production clip only when its metadata and bytes match this manifest and its recorded voice profile and exact text still match current sources. Otherwise it regenerates that clip. Before applying a batch, it verifies every payload hash and voice, re-reads current scene text and sentence counts, and checks that the voice profile is unchanged.

The initial representative scene was `cafe-breakfast` (8 clips), followed by all 46 scenes. Automated validation covers source text, voice identity, missing/empty files, category paths, and bytes; it does not establish perceptual quality. Actual phone listening at 0.7×–1× and sentence transition rhythm remains part of user acceptance.
