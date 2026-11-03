# DEEP INSIDE: shared style and radio integration

Source: https://github.com/EpicStarAi/deepinside-life (inspected 2026-11-03).
User requested reuse of the existing DEEP INSIDE style and located the online
radio / AI-host project while continuing NEW NEWS production.

## Confirmed in source

- `web-deepinside/src/index.css` defines Inter, near-black surfaces, muted blue-grey
  text, cyan `#00ffff` and pink `#ff0055` accents. The newsroom now uses these
  tokens and component treatments while retaining its news-editor functions.
- `web-deepinside/src/App.jsx` has the NOVIKOVA live-room interface, chat and
  browser speech. `startLive()` changes local UI state and adds a system message;
  that callback alone does not establish a broadcasting connection.
- `backend/` is a FastAPI control plane and agent registry. Its default is
  `MOCK_MODE=1`; only the documented video adapter routes real render tasks.
- `run_orchestrator.py` and the legacy LivePortrait queue render video assets.
- `docs/MEDIA_TEMPLATES.md` describes a package of intro, title, hook, content and
  publication metadata; it is useful for common editorial structure.

## Radio path to implement on the existing local host

Reuse approved voice profiles, scripts and the local production queue. Add a
persistent radio rundown with audio files, durations, source credits and actual
playback state. A streaming process must play the rundown continuously and
return real connection/health information; the UI should display live status
only when that process confirms it. News bulletins can be produced once and used
both in vertical video and as an audio segment between tracks.

Needed to call the station operational: a verified stream endpoint, programme
queue, licensed music sources, voice transitions/leveling, reconnect behavior,
and a checked player. These were not established by merely locating the repo.
No radio broadcast was started during this source review.
