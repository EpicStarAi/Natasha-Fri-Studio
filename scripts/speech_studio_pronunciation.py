#!/usr/bin/env python3
"""Install a reviewed Ukrainian script dictionary into an existing Speech project.

Preserves other projects/global dictionaries. Checks actual engine input before
optional synthesis. Run on Windows where Speech Studio exposes loopback MCP.
"""
import argparse
import json
from pathlib import Path
import urllib.request

from production_log import ProductionLog
from review_pronunciation import checked_engine_text, check_studio_preparation


def call(endpoint, name, arguments):
    request = urllib.request.Request(endpoint, data=json.dumps({
        'jsonrpc': '2.0', 'id': 1, 'method': 'tools/call',
        'params': {'name': name, 'arguments': arguments},
    }).encode(), headers={'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream'})
    with urllib.request.urlopen(request, timeout=90) as response:
        raw = response.read().decode()
    if raw.startswith(('event:', 'data:')):
        raw = next(line[6:] for line in raw.splitlines() if line.startswith('data: '))
    response = json.loads(raw)
    if 'error' in response:
        raise RuntimeError(str(response['error']))
    result = response['result']
    if result.get('isError'):
        raise RuntimeError(str(result))
    return result.get('structuredContent') or json.loads(result['content'][0]['text'])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--pid', required=True)
    parser.add_argument('--report', type=Path, required=True)
    parser.add_argument('--endpoint', default='http://127.0.0.1:8797/mcp')
    parser.add_argument('--synthesize', action='store_true')
    a = parser.parse_args()
    log = ProductionLog(a.report.parent / 'production.events.jsonl')
    r = json.loads(a.report.read_text(encoding='utf-8'))
    if r['locale'] != 'uk-UA':
        raise ValueError('This adapter handles Ukrainian only; use the matching language adapter.')
    expected = checked_engine_text(r['sourceText'], 'uk-UA', r)
    rpc = lambda name, args: call(a.endpoint, name, args)
    with log.stage('speech.configure', projectId=a.pid, locale=r['locale']):
        response = rpc('project_get', {'pid': a.pid})
        project = response.get('project', response)
        blocks = [b for ch in project['chapters'] for b in ch['blocks'] if not b.get('hidden')]
        if len(blocks) != 1 or blocks[0]['text'] != r['sourceText']:
            raise ValueError('Adapter needs a single block matching the full reviewed script')
        if project['settings']['engine'] != 'supertonic':
            raise ValueError('This adapter was verified with Supertonic; select it explicitly')
        project['settings'].update(lang='uk', auto_stress=False, normalize=False)
        # Keep any unrelated dictionary rules. Generated entries are tagged by source.
        entries = [e for e in project.get('dictionary', []) if e.get('source') != 'newnews-pronunciation']
        seen = set()
        for row in r['words']:
            if row['word'] in seen or row['word'] == row['say']:
                continue
            seen.add(row['word'])
            entries.insert(0, {'id': 'newnews-uk-' + str(len(seen)), 'find': row['word'], 'say': row['say'],
                              'enabled': True, 'kind': 'word', 'whole_word': True, 'case_sensitive': True,
                              'lang': 'uk', 'voice': '', 'engine': 'supertonic', 'source': 'newnews-pronunciation',
                              'note': row['source'] + '; ' + row['status'], 'review': ''})
        project['dictionary'] = entries
        rpc('project_update', {'pid': a.pid, 'project': project})
    with log.stage('speech.engine_text', projectId=a.pid):
        prepared = rpc('text_prepare', {'pid': a.pid, 'block': blocks[0]['id'], 'text': r['sourceText'], 'lang': 'uk'})
        actual = prepared.get('prepared', prepared)['engine_text']
        (a.report.parent / 'speech-text-prepare.json').write_text(json.dumps(prepared, ensure_ascii=False, indent=2), encoding='utf-8')
        check_studio_preparation(expected, actual)
        log.artifact('speech.engine_text', a.report.parent / 'speech-text-prepare.json')
    if a.synthesize:
        with log.stage('speech.enqueue', projectId=a.pid):
            job = rpc('project_synth', {'pid': a.pid})
            (a.report.parent / 'speech-job.json').write_text(json.dumps(job, ensure_ascii=False, indent=2), encoding='utf-8')
            log.emit('speech.enqueue', 'submitted', projectId=a.pid, job=job)
            print(json.dumps(job))
    else:
        print(json.dumps({'projectId': a.pid, 'engineTextVerified': True, 'listeningReview': 'pending'}))


if __name__ == '__main__':
    main()
