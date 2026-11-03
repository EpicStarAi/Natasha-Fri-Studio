#!/usr/bin/env python3
"""Render the complete presenter with the installed local ComfyUI/InfiniteTalk graph.

Run on the machine that owns ComfyUI's input folder. No model downloads, service
stops, face-crop overlay or publishing. See docs/INFINITETALK_LOCAL.md.
"""
import argparse
import json
import math
import os
from pathlib import Path
import shutil
import tempfile
import time
from urllib.parse import urlencode, urlsplit
from urllib.request import Request, urlopen
import uuid
import wave


def request(base, route, body=None):
    req = Request(base + route, None if body is None else json.dumps(body).encode(),
                  headers={'Content-Type': 'application/json'})
    with urlopen(req, timeout=60) as response:
        return json.load(response)


def capture(args):
    origin = urlsplit(args.url)
    if origin.scheme != 'http' or origin.hostname not in {'127.0.0.1', 'localhost', '::1'} or origin.username or origin.password:
        raise ValueError('Use a local HTTP ComfyUI endpoint')
    if args.output.exists() or args.output.suffix.lower() != '.mp4':
        raise ValueError('Choose a new .mp4 output file')
    if args.image.suffix.lower() not in {'.png', '.jpg', '.jpeg', '.webp'} or not args.image.is_file():
        raise ValueError('A local approved presenter image is required')
    with wave.open(str(args.audio), 'rb') as audio:
        seconds = audio.getnframes() / audio.getframerate()
    if not 0 < seconds <= 60:
        raise ValueError('Use a PCM WAV between 0 and 60 seconds')
    inputs = args.comfy_root.resolve() / 'input'
    if not inputs.is_dir():
        raise ValueError('ComfyUI input directory does not exist')
    base = args.url.rstrip('/')
    queue = request(base, '/queue')
    if queue.get('queue_running') or queue.get('queue_pending'):
        raise ValueError('ComfyUI is busy; no job submitted')
    graph = json.loads(args.workflow.read_text(encoding='utf-8'))
    schema = request(base, '/object_info')
    missing = sorted({node['class_type'] for node in graph.values()} - set(schema))
    if missing:
        raise ValueError('Missing installed nodes: ' + ', '.join(missing))
    tag = 'newnews_' + uuid.uuid4().hex
    image_name, audio_name = tag + args.image.suffix.lower(), tag + '.wav'
    shutil.copyfile(args.image, inputs / image_name)
    shutil.copyfile(args.audio, inputs / audio_name)
    graph['1']['inputs']['image'] = image_name
    graph['2']['inputs']['audio'] = audio_name
    graph['10']['inputs']['num_frames'] = math.ceil(seconds * 25)
    graph['12']['inputs']['seed'] = args.seed
    graph['14']['inputs']['filename_prefix'] = tag
    args.output.parent.mkdir(parents=True, exist_ok=True)
    record = args.output.with_suffix('.job.json')
    if record.exists():
        raise ValueError('Job record already exists')
    response = request(base, '/prompt', {'prompt': graph, 'client_id': tag})
    prompt_id = response['prompt_id']
    metadata = {'promptId': prompt_id, 'audioSeconds': seconds, 'workflow': graph,
                'state': 'submitted', 'sourceSize': [384, 672], 'sourceFps': 25}
    record.write_text(json.dumps(metadata, indent=2), encoding='utf-8')
    print(json.dumps({'promptId': prompt_id, 'record': str(record)}), flush=True)
    deadline = time.monotonic() + args.timeout
    while time.monotonic() < deadline:
        history = request(base, '/history/' + prompt_id).get(prompt_id)
        if history:
            metadata['state'] = history['status']['status_str']
            metadata['history'] = history
            record.write_text(json.dumps(metadata, indent=2), encoding='utf-8')
            if metadata['state'] != 'success':
                raise ValueError('ComfyUI generation failed; inspect ' + str(record))
            clips = [clip for out in history.get('outputs', {}).values()
                     for clip in out.get('gifs', []) if clip.get('filename', '').endswith('.mp4')]
            # VHS may expose both the silent intermediate and the audio-muxed file.
            voiced = [clip for clip in clips if clip.get('filename', '').endswith('-audio.mp4')]
            clip = (voiced or clips)[-1] if clips else None
            if clip is None:
                raise ValueError('Completed graph returned no MP4')
            query = urlencode({k: clip.get(k, '') for k in ['filename', 'subfolder', 'type']})
            with tempfile.TemporaryDirectory(dir=args.output.parent, prefix='.infinitetalk-') as tmp:
                file = Path(tmp) / 'capture.mp4'
                with urlopen(base + '/view?' + query, timeout=120) as src, file.open('wb') as dst:
                    shutil.copyfileobj(src, dst)
                if file.stat().st_size < 1000:
                    raise ValueError('Returned MP4 is empty')
                os.link(file, args.output)
            print(json.dumps({'state': 'captured', 'output': str(args.output)}))
            return
        time.sleep(10)
    # A global interrupt could stop somebody else's next job. Keep the ID for
    # deliberate recovery rather than interrupting the whole ComfyUI instance.
    raise TimeoutError('Wait expired; job may still run. Inspect prompt ' + prompt_id)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--comfy-root', type=Path, required=True)
    parser.add_argument('--image', type=Path, required=True)
    parser.add_argument('--audio', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--url', default='http://127.0.0.1:8188')
    parser.add_argument('--seed', type=int, default=20261103)
    parser.add_argument('--timeout', type=int, default=5400)
    parser.add_argument('--workflow', type=Path, default=Path(__file__).resolve().parents[1] / 'workflows/newnews/infinite-talk-api.json')
    args = parser.parse_args()
    try:
        capture(args)
    except (ValueError, OSError, KeyError, wave.Error, TimeoutError) as error:
        parser.exit(1, f'InfiniteTalk: {error}\n')


if __name__ == '__main__':
    main()
