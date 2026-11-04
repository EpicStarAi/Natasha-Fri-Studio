#!/usr/bin/env python3
"""Create a new avatar project from the frozen, tested InfiniteTalk API graph.

No generation, downloads, service changes or publishing. Python standard library.
"""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import tempfile
import wave

ROOT = Path(__file__).resolve().parents[1]


def prepare(profile_path, image, voice, intro, output):
    output = output.absolute()
    if output.exists():
        raise ValueError('Choose a new project directory; existing projects are never overwritten')
    profile = json.loads(profile_path.read_text(encoding='utf-8'))
    if profile.get('schemaVersion') != 1:
        raise ValueError('Profile schemaVersion must be 1')
    for key in ('name', 'positivePrompt', 'negativePrompt'):
        if not isinstance(profile.get(key), str) or not profile[key].strip():
            raise ValueError(f'Missing {key}; describe the new avatar explicitly')
    seed = profile.get('seed')
    if type(seed) is not int or not 0 <= seed < 2**64:
        raise ValueError('seed must be an unsigned 64-bit integer')
    for path in (image, intro):
        if not path.is_file() or path.suffix.lower() not in {'.png', '.jpg', '.jpeg', '.webp'}:
            raise ValueError(f'Approved local image required: {path}')
    with wave.open(str(voice), 'rb') as wav:
        seconds = wav.getnframes() / wav.getframerate()
    if not 0 < seconds <= 60:
        raise ValueError('Voice must be a PCM WAV of 0–60 seconds; prefer 8–20 seconds')
    graph = json.loads((ROOT / 'workflows/newnews/infinite-talk-api.json').read_text())
    graph['21']['inputs']['text'] = profile['positivePrompt']
    graph['22']['inputs']['text'] = profile['negativePrompt']
    graph['12']['inputs']['seed'] = seed
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=output.parent, prefix='.avatar-') as tmp:
        staging = Path(tmp) / 'project'
        staging.mkdir()
        assets = {'master' + image.suffix.lower(): image, 'voice.wav': voice,
                  'intro' + intro.suffix.lower(): intro}
        for name, source in assets.items():
            shutil.copyfile(source, staging / name)
        for name, data in [('avatar.profile.json', profile), ('workflow.api.json', graph)]:
            (staging / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        manifest = {'schemaVersion': 1, 'audioSeconds': seconds, 'sourceSize': [384, 672],
                    'sourceFps': 25, 'assets': {name: hashlib.sha256((staging / name).read_bytes()).hexdigest() for name in assets},
                    'seed': seed, 'state': 'prepared_not_rendered'}
        (staging / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
        (staging / 'README.txt').write_text(
            'See docs/AVATAR_FACTORY_V1_RU.md in the source kit.\n'
            'Capture with --workflow workflow.api.json and --seed ' + str(seed) + '.\n'
            'Use the same voice.wav for capture and final assembly.\n'
            'This is an API graph, not an editor canvas workflow.\n', encoding='utf-8')
        # mkdir is an exclusive reservation: concurrent runs cannot replace a project.
        output.mkdir()
        for path in staging.iterdir():
            shutil.move(str(path), output / path.name)
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for flag in ('profile', 'image', 'voice', 'intro', 'output'):
        parser.add_argument('--' + flag, type=Path, required=True)
    a = parser.parse_args()
    try:
        result = prepare(a.profile, a.image, a.voice, a.intro, a.output)
        print(json.dumps(result, ensure_ascii=False))
    except (ValueError, OSError, KeyError, TypeError, wave.Error) as error:
        parser.exit(1, f'Avatar project: {error}\n')


if __name__ == '__main__':
    main()
