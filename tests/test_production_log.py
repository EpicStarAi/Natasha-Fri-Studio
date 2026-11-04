from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
from production_log import ProductionLog, inspect
import render_newnews


class ProductionLogTests(unittest.TestCase):
    def test_parallel_writers_share_id_and_preserve_all_events(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)/'production.events.jsonl'
            def write(number):
                log = ProductionLog(path)
                log.emit('worker', 'heartbeat', number=number)
                return log.run_id
            with ThreadPoolExecutor(max_workers=4) as pool:
                ids = list(pool.map(write, range(20)))
            rows = [json.loads(line) for line in path.read_text().splitlines()]
            self.assertEqual(len(set(ids)), 1)
            self.assertEqual(sorted(r['details']['number'] for r in rows), list(range(20)))

    def test_failure_redaction_retry_and_damaged_tail(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)/'production.events.jsonl'
            log = ProductionLog(path)
            log.emit('auth', 'checked', api_key='do-not-record', nested={'password':'hidden'})
            with self.assertRaises(RuntimeError):
                with log.stage('encode'):
                    raise RuntimeError('token=private-value Bearer abcdefghi')
            with log.stage('encode'): pass
            with path.open('a') as file: file.write('{partial\n[]\n')
            summary = inspect(path)
            self.assertEqual(summary['stages']['encode']['state'], 'succeeded')
            self.assertEqual(len(summary['failures']), 1)
            self.assertEqual(len(summary['invalidLines']), 2)
            contents = path.read_text()
            for secret in ('do-not-record', 'hidden', 'private-value', 'abcdefghi'):
                self.assertNotIn(secret, contents)
            self.assertIn('RuntimeError', contents)
            self.assertIn('durationMs', contents)

    def test_missing_input_logs_precise_failure_without_creating_video(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            with self.assertRaises(FileNotFoundError):
                render_newnews.render(root/'missing.json', root, root/'final.mp4')
            summary = inspect(root/'production.events.jsonl')
            self.assertEqual(summary['stages']['media.validate']['state'], 'failed')
            self.assertEqual(summary['stages']['episode.render']['state'], 'failed')
            self.assertFalse((root/'final.mp4').exists())


if __name__ == '__main__': unittest.main()
