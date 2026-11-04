#!/usr/bin/env python3
"""Language-scoped pronunciation review; lexical checks are NOT listening approval."""
import argparse
import hashlib
from importlib.metadata import version
import json
from pathlib import Path
import re
import urllib.request

from production_log import ProductionLog

ACUTE = '\u0301'
WORDS = re.compile(r"[^\W\d_]+(?:['’ʼ-][^\W\d_]+)*")
LOCALES = {'uk': 'uk-UA', 'uk-UA': 'uk-UA', 'ru': 'ru-RU', 'ru-RU': 'ru-RU',
           'en-US': 'en-US', 'en-GB': 'en-GB'}


def locale_of(value):
    if value not in LOCALES:
        raise ValueError('Specify uk-UA, ru-RU, en-US or en-GB (en alone has no accent).')
    return LOCALES[value]


def digest(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def speechkit(text):
    """Legacy SpeechKit markup, NOT safe for Ukrainian in Speech Studio 0.3.5."""
    return re.sub(r'([А-Яа-яІіЇїЄєҐґ])\u0301', r'+\1', text)


def ru_review(text, endpoint):
    req = urllib.request.Request(endpoint, data=json.dumps({
        'jsonrpc': '2.0', 'id': 1, 'method': 'tools/call',
        'params': {'name': 'text_stress', 'arguments': {'text': text, 'lang': 'ru'}}
    }).encode(), headers={'Content-Type': 'application/json',
                         'Accept': 'application/json, text/event-stream'})
    with urllib.request.urlopen(req, timeout=90) as response:
        raw = response.read().decode()
    if raw.startswith(('data:', 'event:')):
        raw = next(line[6:] for line in raw.splitlines() if line.startswith('data: '))
    response = json.loads(raw)
    if 'error' in response:
        raise RuntimeError(str(response['error']))
    result = response['result']
    if result.get('isError'):
        raise RuntimeError(str(result))
    result = result.get('structuredContent') or json.loads(result['content'][0]['text'])
    if not result.get('russian'):
        raise ValueError('Russian dictionary did not accept this text.')
    return result


def review(text, locale='uk-UA', overrides=None, endpoint='http://127.0.0.1:8797/mcp'):
    locale = locale_of(locale)
    if not text.strip():
        raise ValueError('Script is empty')
    if ACUTE in text or re.search(r'\+[А-Яа-яІіЇїЄєҐґ]', text):
        raise ValueError('Use the unmarked editorial script; stress belongs in the review.')
    rows, issues, dictionary = [], [], {}
    if locale == 'uk-UA' and re.search('[ыэёъЫЭЁЪ]', text):
        issues.append({'kind': 'language_mismatch', 'note': 'Russian-specific letters in Ukrainian script'})
    if re.search(r'\d', text):
        issues.append({'kind': 'numbers', 'note': 'Expand numbers/dates into words in the selected language'})
    rules = (overrides or {}).get(locale, {})
    if locale == 'uk-UA':
        from ukrainian_word_stress import Stressifier, Disambiguation, StressSymbol, OnAmbiguity
        from ukrainian_word_stress.stressify_ import _trie_value
        params = dict(disambiguation=Disambiguation.Dictionary,
                      stress_symbol=StressSymbol.CombiningAcuteAccent)
        stress = Stressifier(**params, on_ambiguity=OnAmbiguity.Skip)
        variants = Stressifier(**params, on_ambiguity=OnAmbiguity.All)
        dictionary = {'id': 'lang-uk/ukrainian-word-stress', 'version': version('ukrainian-word-stress'),
                      'mode': 'dictionary-only; ambiguous words require context'}

        def mark(match):
            word = match.group()
            spoken, status, source = stress(word), 'dictionary', dictionary['id']
            if _trie_value(stress.dict, word) is None:
                status = 'unknown'
            elif variants(word).count(ACUTE) > 1 and ACUTE not in spoken:
                status = 'ambiguous'
            rule = rules.get(word)
            if rule:
                if rule['say'].replace(ACUTE, '') != word:
                    raise ValueError('Stress override must preserve spelling: ' + word)
                if not rule.get('source'):
                    raise ValueError('Override needs a source or an explicit editorial note')
                spoken, source = rule['say'], rule['source']
                status = 'context_rule' if rule.get('verifiedLexically') else 'editorial_unverified'
            row = {'word': word, 'say': spoken, 'status': status, 'source': source}
            if status in ('unknown', 'ambiguous', 'editorial_unverified'):
                row['candidates'] = variants(word)
                issues.append({'kind': status, 'word': word})
            rows.append(row)
            return spoken
        engine_text = WORDS.sub(mark, text)
    elif locale == 'ru-RU':
        result = ru_review(text, endpoint)
        engine_text = re.sub(r'\+([А-Яа-яЁё])', r'\1' + ACUTE, result['text'])
        dictionary = {'id': 'Speech Studio RUAccent', 'locale': 'ru-RU'}
        rows = result.get('words', [])
        issues.extend({'kind': 'ru_review', 'word': row.get('word')}
                      for row in rows if row.get('doubt') or row.get('source') not in ('dictionary', 'omograph'))
    else:
        engine_text = text
        if locale == 'en-US':
            import cmudict
            lexicon = cmudict.dict()
            dictionary = {'id': 'cmusphinx/cmudict', 'version': version('cmudict'), 'locale': 'en-US'}
        else:
            lexicon = {}
            dictionary = {'id': 'curated UK dictionary required', 'locale': 'en-GB'}
        for word in WORDS.findall(text):
            phones = lexicon.get(word.lower(), [])
            rule = rules.get(word, {})
            rows.append({'word': word, 'phonemes': phones, 'reference': rule})
            if not phones and not rule.get('source'):
                issues.append({'kind': 'unknown', 'word': word})
            elif len(phones) > 1:
                issues.append({'kind': 'pronunciation_variants', 'word': word})
        issues.append({'kind': 'accent_review', 'note': 'Supertonic lang=en does not enforce US/UK accent; listen to the selected voice'})
    return {'schemaVersion': 1, 'channel': 'NEW🌐NEWS', 'presenter': 'Novikova💋Forever',
            'locale': locale, 'modelLanguage': locale[:2], 'sourceText': text,
            'sourceSha256': digest(text), 'engineText': engine_text,
            'engineTextSha256': digest(engine_text), 'speechStudioText': engine_text,
            'dictionary': dictionary, 'words': rows, 'issues': issues,
            'lexicalReview': 'needs_review' if issues else 'dictionary_checked',
            'listeningReview': 'pending', 'publicationReady': False}


def checked_engine_text(text, locale, report):
    if report.get('locale') != locale_of(locale) or report.get('sourceSha256') != digest(text):
        raise ValueError('Pronunciation report belongs to a different script or language')
    marked = report['engineText']
    if report.get('engineTextSha256') != digest(marked):
        raise ValueError('Pronunciation report checksum mismatch')
    if marked.replace(ACUTE, '') != text:
        raise ValueError('Pronunciation report changed script words; review the editorial text first')
    return marked


def check_studio_preparation(expected, actual):
    # Speech Studio canonicalizes quotation marks; words and stress must survive.
    normalize = lambda s: s.translate(str.maketrans({'«': '"', '»': '"', '’': "'"}))
    if normalize(expected) != normalize(actual):
        raise ValueError('Speech Studio changed words or dropped stress; synthesis blocked')


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--text-file', type=Path, required=True)
    p.add_argument('--output', type=Path, required=True)
    p.add_argument('--locale', default='uk-UA', choices=list(LOCALES))
    p.add_argument('--overrides', type=Path)
    p.add_argument('--speech-endpoint', default='http://127.0.0.1:8797/mcp')
    a = p.parse_args()
    log = ProductionLog(a.output.parent / 'production.events.jsonl')
    with log.stage('voice.pronunciation', locale=a.locale):
        text = a.text_file.read_text(encoding='utf-8-sig').strip()
        result = review(text, a.locale, json.loads(a.overrides.read_text(encoding='utf-8')) if a.overrides else None,
                        a.speech_endpoint)
        with a.output.open('x', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        log.emit('voice.pronunciation', 'review', locale=result['locale'], dictionary=result['dictionary'],
                 sourceSha256=result['sourceSha256'], issues=result['issues'], listeningReview='pending')
        log.artifact('voice.pronunciation', a.output)
    print(json.dumps({'output': str(a.output), 'issues': result['issues']}, ensure_ascii=False))


if __name__ == '__main__':
    main()
