# Local full-presenter motion

The first OpenSpline pilot animated a face crop over a still master. Both raised
hands stayed frozen. It is retained as a technical pilot, not a motion reference.
This graph generates the entire frame from the approved image and voice.

## Existing installation used

Windows `C:\AI_FACTORY\ComfyUI`, localhost port 8188, RTX 5060 8GB.
The graph uses the installed WanVideoWrapper, GGUF and VideoHelperSuite nodes:

- Wan 2.1 I2V 14B Q4_K_M + InfiniteTalk Single Q8.
- Lightx2v I2V 480p rank64 LoRA, six sampling steps.
- Wan VAE; cached TencentGameMate/chinese-wav2vec2-base audio encoder.
- Scaled FP8 UMT5 loaded by native `CLIPLoader` → `CLIPTextEncode` →
  `WanVideoTextEmbedBridge`. The wrapper's own text loader rejects this specific
  scaled encoder; do not replace the already installed model blindly.
- 36 swapped blocks, CPU offload; 81-frame windows with 9 motion frames.

The source render is **384×672 at 25 fps** to fit the available GPU. Exporting it
as 1080×1920 does not make the generated detail native 1080p. Inspect identity,
hands, sleeves, microphone and studio continuity before accepting a take.

## Capture

Run with the Python interpreter on the ComfyUI machine. ComfyUI must already be
running and idle, and competing GPU services must have released their models.
Do not stop occupied services. Restore any temporarily stopped service afterward.

```powershell
python scripts/capture_infinitetalk.py `
  --comfy-root C:\AI_FACTORY\ComfyUI `
  --image C:\path\presenter-master.png `
  --audio C:\path\voice.wav `
  --output C:\path\presenter-motion.mp4
```

The runner copies unique inputs, checks required node classes, submits one job,
records its exact graph/ID, waits for that job and downloads its MP4. No service
management, model installation or social publishing is performed. On timeout it
preserves the job ID; check ComfyUI before retrying to avoid duplicate work.
The installed models must match the filenames in the API graph.

Use `render_newnews.py` with an accepted capture and approved one-second intro to
assemble 1080×1920/30fps without subtitles. Keep the entire generated frame; do
not overlay a moving face onto the old still body. Preserve all spoken audio.
