# NEW🌐NEWS — production continuity

This file records user decisions and observed state. Read it before changing the
production path. Do not restart tool selection when a working setup is recorded.

## Latest user correction — 2026-11-04 (takes precedence)

- Presenter display name: **Novikova💋Forever**. Channel: **NEW🌐NEWS**.
- Broadcast language: **Ukrainian**, locale `uk-UA`, Supertonic model code `uk`.
- Previous Russian clips are historical assets, not Ukrainian versions.
- Stress routing: UK dictionary for UK, Speech Studio RUAccent for RU,
  CMUdict for en-US only; en-GB requires a UK reference and accent review.
- Keep unmarked editorial text separately from pronunciation markup. Log the
  locale, dictionary/version, ambiguous words and hashes. ASR does not certify stress.
- See [SPEECH_PRONUNCIATION_RU.md](SPEECH_PRONUNCIATION_RU.md).
- The technical ID `newnews-rus`, branch/service names remain for compatibility;
  they no longer determine broadcast language or visible channel identity.

## Approved result

- Use the same approved brunette presenter and studio master from
  NEW_NEWS_REMOTION_TEMPLATE_V1_SOURCE.zip. Do not introduce a new presenter.
- Output 1080×1920, 30 fps, no subtitles, one-second intro.
- Natural coordinated movement of face, shoulders and hands; no frozen mid-air
  gesture, detached moving head or static lower body presented as finished work.
- Ukrainian speech must finish naturally, without clipped words or endings.
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
- The F1 preset is not a voice clone. The user has now approved the complete
  motion V2 clip, including this trial voice, as a reusable V1 baseline.
- Editor does not launch GPU generation. Social posting is not connected.

## Current task and approved checkpoint (2026-11-04)

The full-presenter motion fix is complete and the user approved the delivered
MOTION_V2 video. Their next request is to preserve the result and document a
reusable template for other avatars and themes. Do not restart tool selection.

- Operator guide: [AVATAR_FACTORY_V1_RU.md](AVATAR_FACTORY_V1_RU.md).
- Frozen pre-template code: c4965b9c729c2df66c3ad634fedcac1446dce249;
  branch checkpoint/avatar-motion-v1-approved-2026-11-04.
- Approved chat MP4 SHA-256:
  e2173b9d1a6d706bb898440bc1c287e1a61b30d97d243463a54cb99d365bd978.
- Runtime/model inventories: config/avatar-v1/; reusable profiles:
  templates/avatar-v1/. The alternative profile is an example, not a rendered
  or user-approved second avatar.
- Exact TTS: /home/buch/newnews-tools/tts-supertonic/.venv/bin/python;
  SDK supertonic 1.3.1, model supertonic-3, F1, ru, 8 steps, speed 1.0, CPU.
  Production synthesis disables downloads. Original WAV is 13.792653 seconds.
- New helpers prepare a profile-specific graph and assemble any topic from a
  generated clip plus its original WAV. They do not automate GPU service
  handoff, editor integration or social publishing.

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
- GPU lease completed: idle OpenSpline was stopped for the render, then restored
  with /home/buch/os_start_low.sh. /readyz confirmed ready=true, occupied=false.
- Main Windows ComfyUI was started on localhost:8188 for this task, then its
  models were freed and the task-owned idle process stopped to return GPU memory.
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

## Verified motion take and current deployment

- InfiniteTalk prompt 85e0b67d-b836-416b-8c14-234490ff9ad7 completed successfully
  in 1322 seconds. Source: 384×672 at 25fps. Eight sampled times show changing
  hand positions, hands resting on the desk, shoulder/head movement and retained
  face, hoodie, microphone and studio. Do not call this native 1080p detail.
- The generated silent intermediate has 369 frames/14.76s. VHS's audio-muxed
  file has 342 video frames/13.68s and the full 13.792653s audio. The delivered
  take uses the untrimmed generated video plus the original WAV, normalized to
  13.8s before adding the one-second intro. No spoken ending is discarded.
- Windows outputs: C:\AI_FACTORY\NEWNEWS_RUS\presenter-motion-complete.mp4 and
  NEW_NEWS_RUS_MOTION_V2_1080x1920.mp4. Reusable graph/runner are now in this repo.
- Newsroom DEEP INSIDE styling deployed to http://127.0.0.1:17888/.
- VPN source recovered from C:\Users\Admin\Documents\HIDE MY NAME VPN into
  /home/buch/projects/hidemyname-wsl. Enabled systemd user services:
  hidemyname-api, hidemyname-mini, hidemyname-admin, hidemyname-tunnel.
- VPN admin is only http://127.0.0.1:20130/admin/. Mini App local port 18938,
  internal API port 8100; all bind loopback. Only the Mini App is tunneled.
- Current public URL is recorded on the PC in
  /home/buch/projects/hidemyname-wsl/.local/hidemyname/public-url.txt;
  Quick Tunnel addresses may change on restart. Do not tunnel the admin/API.
- VPN bot is NOT ONLINE: no valid TELEGRAM_BOT_TOKEN was found in recovered
  project configs. Local private setup: C:\AI_FACTORY\HIDEMYNAME_WSL\Connect-Telegram-Bot.cmd.
- Existing VPN production builds, 14 download/operator tests, 2 URL tests and
  45 gateway HTTP checks passed. The inherited API still has 56 TypeScript
  errors; details are in the VPN project's docs/WSL_DEPLOYMENT.md. Do not report
  the entire VPN codebase as clean or VPN traffic/subscriptions as restored.

## Timed accompaniment — user requirement (2026-11-04)

Keep the approved full presenter visible and add prepared image/video windows
at upper left, as in user reference 20190.png. Synchronize each change with a
specific phrase and the actual voice timing. Keep face and hands clear. Add
short headlines, source credits, archive/visualization labels; no continuous
subtitles. Windows are a separate montage layer, editable without regenerating
the presenter when narration is unchanged. Interactive controls belong in the
editor; the MP4 contains the rendered animated windows.
# Производственный журнал

По запросу пользователя включён структурированный JSONL-журнал: общий runId,
время, PID, этап, длительность, ошибка/traceback, promptId ComfyUI, SHA-256 файлов.
Основные команды озвучки, генерации и монтажа пишут его автоматически.
Для уже запущенной Hera подключён наблюдатель; предыдущие готовые файлы помечены
как наблюдаемые, без выдуманных исторических событий. См. PRODUCTION_LOGGING_RU.md.
