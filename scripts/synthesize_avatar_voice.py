#!/usr/bin/env python3
"""Local Supertonic 3 preset voices. Run inside the existing Supertonic venv."""
import argparse
import json
import os
from pathlib import Path
import tempfile
from production_log import ProductionLog


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--text-file', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--model-dir', type=Path, required=True)
    parser.add_argument('--voice', default='F1')
    parser.add_argument('--language', default='ru')
    parser.add_argument('--speed', type=float, default=1.0)
    parser.add_argument('--run-log', type=Path)
    a = parser.parse_args()
    log = ProductionLog(a.run_log or a.output.parent / 'production.events.jsonl')
    with log.stage('voice.synthesis', voice=a.voice, language=a.language, speed=a.speed,
                   model='supertonic-3', textFile=str(a.text_file)):
        with log.stage('voice.validate'):
            if a.output.exists() or a.output.suffix.lower() != '.wav':
                raise ValueError('Choose a new .wav output')
            if not 0.5 <= a.speed <= 2:
                raise ValueError('speed must be between 0.5 and 2')
            text = a.text_file.read_text(encoding='utf-8-sig').strip()
            if not text:
                raise ValueError('Script is empty')
        from supertonic import TTS
        with log.stage('voice.model_load'):
            tts = TTS(model='supertonic-3', model_dir=str(a.model_dir), auto_download=False,
                      intra_op_num_threads=8, inter_op_num_threads=1)
        if a.voice not in tts.voice_style_names:
            raise ValueError('Unknown preset voice: ' + a.voice)
        audio, _ = tts.synthesize(text, voice_style=tts.get_voice_style(a.voice),
                                lang=a.language, total_steps=8, speed=a.speed)
        a.output.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=a.output.parent, prefix='.avatar-voice-') as tmp:
            path = Path(tmp) / 'voice.wav'
            tts.save_audio(audio, str(path))
            os.link(path, a.output)
        log.artifact('voice.output', a.output)
    print(json.dumps({'output': str(a.output), 'voice': a.voice, 'language': a.language,
                      'model': 'supertonic-3', 'engine': 'ONNX CPU'}))


if __name__ == '__main__':
    main()
