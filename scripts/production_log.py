#!/usr/bin/env python3
"""Durable per-project JSONL events, shared run ID and a human-readable status CLI.

No environment dumps, input text, cookies or credentials. Logs append; a failed
stage is never silently converted into success. Default: output folder / production.events.jsonl.
"""
import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import tempfile
import time
import traceback
import uuid


def utc_now():
    return datetime.now(timezone.utc).isoformat(timespec='milliseconds')


def clean(value, key=''):
    if re.search(r'token|secret|password|authorization|cookie|api.?key', key, re.I):
        return '[REDACTED]'
    if isinstance(value, dict):
        return {str(k): clean(v, str(k)) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [clean(v) for v in value]
    if isinstance(value, Path):
        return clean(str(value))
    if isinstance(value, str):
        value = re.sub(r'(?i)Bearer\s+\S+', 'Bearer [REDACTED]', value)
        value = re.sub(r'\b\d{6,}:[A-Za-z0-9_-]{20,}\b', '[REDACTED]', value)
        value = re.sub(r'\bsk-[A-Za-z0-9_-]{12,}\b', '[REDACTED]', value)
        value = re.sub(r'(?i)(token|password|secret|api_key)([=:]\s*)[^\s&,;]+', r'\1\2[REDACTED]', value)
        return value[:8000]
    return value


class ProductionLog:
    def __init__(self, path):
        self.path = Path(path).absolute()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        meta = self.path.with_suffix('.run.json')
        if not meta.exists():
            with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=meta.parent, delete=False) as tmp:
                json.dump({'runId': str(uuid.uuid4()), 'createdAt': utc_now()}, tmp)
                temporary = Path(tmp.name)
            try:
                os.link(temporary, meta)
            except FileExistsError:
                pass
            finally:
                temporary.unlink(missing_ok=True)
        self.run_id = json.loads(meta.read_text(encoding='utf-8'))['runId']

    def emit(self, stage, event, **details):
        record = {'timestamp': utc_now(), 'runId': self.run_id, 'stage': stage,
                  'event': event, 'pid': os.getpid(), 'details': clean(details)}
        encoded = (json.dumps(record, ensure_ascii=False, allow_nan=False) + '\n').encode('utf-8')
        fd = os.open(self.path, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o600)
        try:
            # One append write per event; fsync before acknowledging the stage.
            if os.write(fd, encoded) != len(encoded):
                raise OSError('Incomplete production log write')
            os.fsync(fd)
        finally:
            os.close(fd)
        return record

    @contextmanager
    def stage(self, name, **details):
        started = time.monotonic()
        self.emit(name, 'started', **details)
        try:
            yield
        except BaseException as error:
            self.emit(name, 'failed', durationMs=round((time.monotonic()-started)*1000),
                      errorType=type(error).__name__, message=str(error), traceback=traceback.format_exc())
            raise
        else:
            self.emit(name, 'succeeded', durationMs=round((time.monotonic()-started)*1000))

    def artifact(self, stage, path, **details):
        path = Path(path)
        digest = hashlib.sha256()
        with path.open('rb') as file:
            for block in iter(lambda: file.read(1024*1024), b''):
                digest.update(block)
        self.emit(stage, 'artifact', path=str(path), bytes=path.stat().st_size,
                  sha256=digest.hexdigest(), **details)


def inspect(path):
    records = []
    invalid_lines = []
    for number, line in enumerate(Path(path).read_text(encoding='utf-8').splitlines(), 1):
        try:
            record = json.loads(line)
            if not isinstance(record, dict) or not all(k in record for k in ('stage', 'event', 'timestamp', 'runId')):
                raise ValueError('Invalid event')
            records.append(record)
        except (json.JSONDecodeError, ValueError):
            invalid_lines.append(number)
    stages = {}
    for record in records:
        key = record['stage']
        if record['event'] in {'started', 'succeeded', 'failed'}:
            stages[key] = {'state': record['event'], 'timestamp': record['timestamp'], **record.get('details', {})}
    return {'runId': records[-1]['runId'] if records else None, 'events': len(records),
            'lastEvent': records[-1] if records else None, 'stages': stages,
            'failures': [r for r in records if r['event']=='failed'], 'invalidLines': invalid_lines}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('log', type=Path)
    args = parser.parse_args()
    print(json.dumps(inspect(args.log), ensure_ascii=False, indent=2))
