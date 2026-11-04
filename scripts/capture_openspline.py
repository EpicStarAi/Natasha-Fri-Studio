#!/usr/bin/env python3
"""Capture one local OpenSpline session without restarting or replacing other sessions.

Run in the installed OpenSpline venv (httpx + websockets). The server retains
ownership of GPU scheduling. Requires an approved portrait and finished voice.
"""
import argparse
import asyncio
import base64
import json
from pathlib import Path
import subprocess
import tempfile
from urllib.parse import urlsplit

import httpx
import websockets


async def capture(portrait, audio, output, server):
    endpoint = urlsplit(server)
    if endpoint.scheme != 'http' or endpoint.hostname not in {'localhost', '127.0.0.1', '::1'}:
        raise ValueError('This adapter only sends media to the local OpenSpline service')
    if output.exists():
        raise ValueError('Output already exists')
    output.parent.mkdir(parents=True, exist_ok=True)
    session = None
    upload = None
    async with httpx.AsyncClient(base_url=server, timeout=180, trust_env=False) as client:
        ready = (await client.get('/readyz')).raise_for_status().json()
        if not any(w['ready'] and not w['occupied'] and w['quality'] == 'low' for w in ready['workers']):
            raise RuntimeError('No free low-quality worker. Existing sessions were not interrupted.')
        try:
            response = await client.post('/v1/sessions', files={'portrait': (portrait.name, portrait.read_bytes(), 'image/png')}, data={'quality': 'low'})
            session = response.raise_for_status().json()
            publisher = {'Authorization': f"Bearer {session['publisher_token']}"}
            session_path = f"/v1/sessions/{session['id']}"
            socket = server.replace('http://', 'ws://', 1) + session_path + '/playback'
            with tempfile.TemporaryDirectory(prefix='.openspline-', dir=output.parent) as directory:
                directory = Path(directory)
                frames = 0
                samples = 0
                async with websockets.connect(socket, max_size=8_000_000, proxy=None) as ws, websockets.connect(
                        server.replace('http://', 'ws://', 1) + session_path + '/audio', proxy=None) as control:
                    await ws.send(json.dumps({'token': session['token']}))
                    hello = json.loads(await asyncio.wait_for(ws.recv(), 30))
                    if hello.get('type') != 'connected':
                        raise RuntimeError('Unexpected OpenSpline playback handshake')
                    await ws.send(json.dumps({'type': 'ready'}))
                    await control.send(json.dumps({'token': session['publisher_token']}))
                    while True:
                        control_hello = json.loads(await asyncio.wait_for(control.recv(), 30))
                        if control_hello.get('type') == 'ready':
                            break
                        if control_hello.get('type') == 'error':
                            raise RuntimeError(control_hello.get('message', 'OpenSpline publisher failed'))

                    async def upload_and_finish():
                        result = await client.post(session_path + '/file', headers=publisher,
                            files={'audio': (audio.name, audio.read_bytes(), 'audio/wav')})
                        result.raise_for_status()
                        # /file queues PCM, but only end_turn flushes its last partial chunk.
                        await control.send(json.dumps({'type': 'end_turn', 'id': 'capture-end', 'drain': False}))
                        while True:
                            response = json.loads(await asyncio.wait_for(control.recv(), 180))
                            if response.get('type') == 'error':
                                raise RuntimeError(response.get('message', 'OpenSpline capture failed'))
                            if response.get('type') == 'ack' and response.get('id') == 'capture-end':
                                return response['target_samples']

                    upload = asyncio.create_task(upload_and_finish())
                    while True:
                        event = json.loads(await asyncio.wait_for(ws.recv(), 180))
                        if event.get('type') == 'media':
                            if base64.b64decode(event['audio']):
                                (directory / f'frame-{frames:06d}.jpg').write_bytes(base64.b64decode(event['image'], validate=True))
                                frames += 1
                            samples = event['samples']
                            await ws.send(json.dumps({'type': 'played', 'samples': samples, 'epoch': event['epoch']}))
                            if frames % 50 == 0:
                                print(json.dumps({'frames': frames, 'seconds': round(samples / 48000, 2)}), flush=True)
                        elif event.get('type') == 'idle':
                            await ws.send(json.dumps({'type': 'idle_played', 'sequence': event['sequence'], 'epoch': event['epoch']}))
                        if upload.done():
                            if samples >= upload.result() and frames:
                                break
                if not frames:
                    raise RuntimeError('OpenSpline returned no video frames')
                subprocess.run(['ffmpeg', '-v', 'error', '-n', '-framerate', '25', '-i', str(directory / 'frame-%06d.jpg'),
                    '-i', str(audio), '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18',
                    '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-af', 'apad', '-t', str(frames / 25),
                    '-movflags', '+faststart', str(output)], check=True)
                print(json.dumps({'state': 'captured', 'frames': frames, 'seconds': frames / 25, 'output': str(output)}), flush=True)
        finally:
            if upload and not upload.done():
                upload.cancel()
                await asyncio.gather(upload, return_exceptions=True)
            if session:
                await client.delete(f"/v1/sessions/{session['id']}", headers={'Authorization': f"Bearer {session['publisher_token']}"})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--portrait', type=Path, required=True)
    parser.add_argument('--audio', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--server', default='http://127.0.0.1:7860')
    args = parser.parse_args()
    asyncio.run(asyncio.wait_for(capture(args.portrait, args.audio, args.output, args.server.rstrip('/')), 600))


if __name__ == '__main__':
    main()
