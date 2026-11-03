# NEW🌏NEWS🇷🇺RUS — production continuity

This file records user decisions and observed state. Read it before changing the
production path. Do not restart tool selection when a working setup is recorded.

## Approved result

- Use the same approved brunette presenter and studio master from
  NEW_NEWS_REMOTION_TEMPLATE_V1_SOURCE.zip. Do not introduce a new presenter.
- Output 1080×1920, 30 fps, no subtitles, one-second intro.
- Natural coordinated movement of face, shoulders and hands; no frozen mid-air
  gesture, detached moving head or static lower body presented as finished work.
- Russian speech must finish naturally, without clipped words or endings.
- Run through the existing local Windows/WSL AI_FACTORY. User explicitly points
  to Huggsfree/Freefield, Wan 2, ComfyUI and DeepFace; inspect existing workflows
  and installations before proposing or installing replacements.
- Quality takes priority. Inspect hands over time as well as face/lip-sync before
  showing a render as approved or publication-ready.

## Existing implementation (verified 2026-11-03)

- GitHub: EpicStarAi/Natasha-Fri-Studio, draft PR #3,
  branch codex/newnews-rus-studio.
- Local WSL checkout: /home/buch/projects/newnews-rus-studio.
- Windows studio URL: http://127.0.0.1:17888/.
- User systemd unit: newnews-rus-studio.service.
- NEWNEWS_OPEN_V1 is an existing independent night workflow. Do not replace it
  with the studio prototype or alter its schedule as part of a visual fix.
- OpenSpline on 7860 produced 345 frames/13.8s with local Supertonic F1 voice.
  Its publisher end_turn is necessary to flush the last audio chunk.
- The delivered 14.8s pilot overlays a 640px animated face crop onto a static
  portrait. USER REJECTED THIS BODY MOTION: both hands freeze in a raised gesture.
  It is a technical pilot, not the final animation method.
- Trial F1 voice is not a cloned/approved final voice.
- Editor does not launch GPU generation. Social posting is not connected.

## Current task

Fix full-presenter motion using the existing AI_FACTORY toolchain, produce and
inspect a short real motion test, then carry the successful method into a new
video. Preserve the approved identity and visual format. Do not merely explain
why the hands froze, crop them away, or call a zoom on a still image animation.

## Retrieved prior setup — verify runtime before use

- AI_FACTORY root: C:\AI_FACTORY.
- Wan Animate 2 experiment: C:\AI_FACTORY\experiments\wan_animate2;
  ComfyUI port 8190; Wan-Animate-2-14B-TURBO-Q4_K_M.gguf (~11.3GB, CPU offload).
- Main ComfyUI: C:\AI_FACTORY\ComfyUI, port 8188; ReActor/HyperSwap and
  Wan 2.2 Animate workflows reportedly present.
- LivePortrait: C:\Users\Admin\deep_inside_project\LivePortrait.
- Prior Wan motion transfer changed clothing/background; preserving the studio
  is an explicit quality gate, not an assumption.
- RTX 5060 has 8GB VRAM. Serialize GPU jobs and inspect queues before releasing
  idle model memory; restore services after temporary changes.

## Additional instructions in the same task

- DEEP INSIDE is the user's existing design system. Source repository:
  https://github.com/EpicStarAi/deepinside-life. Use its actual assets/tokens.
- The user also wants to revive the DEEP INSIDE online radio with AI hosts;
  inspect existing implementation and distinguish UI mock status from a stream.
- Start the existing Hide MY NAME VPN webapp, Telegram bot and admin in WSL
  background services. Admin must be localhost-only. Resolve existing config,
  data and bot process before starting; do not create a duplicate poller.
- These are additions to the moving-hands video fix, not replacements.
- Active local GPU lease: OpenSpline native PID 2275 was gracefully stopped
  after /readyz confirmed no occupied sessions. Restore it using its existing
  /home/buch/.local/share/openspline/run.sh after the ComfyUI work.
- Main Windows ComfyUI was started on localhost:8188 (PID 19680).
- Full-body voice-conditioned path found: Wan 2.1 I2V Q4 + InfiniteTalk Q8,
  existing Lightx2v LoRA and installed WanVideoWrapper example workflow.
- First prompt 4efafbfc-255a-4d33-b8f2-b787c2ba865f failed before generation:
  wrapper text encoder rejects fp8-scaled UMT5. Use the native conditioning
  bridge; do not replace the already verified model or download another blindly.

## DEEP INSIDE source findings

- Actual design tokens in web-deepinside/src/index.css: #030305 background,
  #0a0a0f panels, #12121a raised surfaces, #f0f4f8 text, #8892b0 muted,
  #00ffff cyan and #ff0055 pink accents; Inter typography.
- The repository contains NOVIKOVA/LivePortrait, web-deepinside live-room UI,
  FastAPI agent registry and a legacy render queue. The new registry defaults
  to mock mode; an actual continuous radio stream is not verified.
- Radio should reuse voices and scheduled content from the production system,
  but a visible Live badge or browser TTS is not proof of an online station.
