import contextlib
import importlib.util
import io
import json
from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('render_newnews', Path(__file__).parents[1] / 'scripts/render_newnews.py')
renderer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(renderer)


def package():
    return {'schemaVersion': 1, 'channel': {'id': 'newnews-rus', 'format': renderer.FORMAT.copy()},
            'introAsset': 'intro.png', 'scenes': [{'narration': 'Тестовая проверка монтажа без реальной новости.',
            'sourceUrls': ['https://example.org'], 'presenterAsset': 'host.mp4', 'brollAsset': 'broll.png'}]}


class ValidationTests(unittest.TestCase):
    def test_refuses_paths_and_urls(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory).resolve()
            for name in ['../outside.mp4', 'https://example.org/movie.mp4', 'x;echo.mp4', '/tmp/a.mp4']:
                with self.assertRaises(ValueError):
                    renderer.asset(root, name, renderer.VIDEOS)

    def test_refuses_symlink_outside_root(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / 'assets'; root.mkdir()
            outside = Path(directory) / 'secret.mp4'; outside.touch()
            (root / 'clip.mp4').symlink_to(outside)
            with self.assertRaises(ValueError): renderer.asset(root, 'clip.mp4', renderer.VIDEOS)

    def test_refuses_manifest_without_sources_or_changed_format(self):
        for mutation in ['sources', 'format']:
            value = package()
            if mutation == 'sources': value['scenes'][0]['sourceUrls'] = []
            else: value['channel']['format']['width'] = 720
            with self.assertRaises(ValueError): renderer.validate_manifest(value)

    def test_duration_budget_uses_actual_media_instead_of_claimed_timing(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory).resolve()
            for name in ['intro.png', 'host.mp4']: (root / name).touch()
            value = package(); value['scenes'][0]['brollAsset'] = ''
            value['scenes'][0]['durationSeconds'] = 5
            with patch.object(renderer, 'presenter_duration', return_value=60):
                with self.assertRaisesRegex(ValueError, 'превышает 60'):
                    renderer.plan_render(value, root)


@unittest.skipUnless(shutil.which('ffmpeg') and shutil.which('ffprobe'), 'FFmpeg required')
class RenderTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temporary = tempfile.TemporaryDirectory()
        cls.root = Path(cls.temporary.name)
        base = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y']
        for name, color in [('intro.png', 'red'), ('broll.png', 'blue')]:
            renderer.run(base + ['-f', 'lavfi', '-i', f'color=c={color}:s=320x240', '-frames:v', '1', str(cls.root / name)])
        renderer.run(base + ['-f', 'lavfi', '-i', 'color=c=green:s=360x640:r=30', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000', '-t', '2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', str(cls.root / 'host.mp4')])
        renderer.run(base + ['-i', str(cls.root / 'host.mp4'), '-an', '-c:v', 'copy', str(cls.root / 'silent.mp4')])

    @classmethod
    def tearDownClass(cls):
        cls.temporary.cleanup()

    def test_missing_audio_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'озвучкой'):
            renderer.presenter_duration(self.root / 'silent.mp4')

    def test_end_to_end_render_with_broll_and_full_host_preserves_duration(self):
        value = package()
        value['scenes'].append({**value['scenes'][0], 'brollAsset': ''})
        manifest = self.root / 'episode.json'; manifest.write_text(json.dumps(value))
        output = self.root / 'result.mp4'
        with contextlib.redirect_stdout(io.StringIO()):
            report = renderer.render(manifest, self.root, output)
        self.assertAlmostEqual(report['actualDurationSeconds'], 5, delta=0.3)
        info = renderer.probe(output)
        video = next(stream for stream in info['streams'] if stream['codec_type'] == 'video')
        self.assertEqual((video['width'], video['height'], video['r_frame_rate']), (1080, 1920, '30/1'))
        self.assertTrue(any(stream['codec_type'] == 'audio' for stream in info['streams']))
        self.assertFalse(any(stream['codec_type'] == 'subtitle' for stream in info['streams']))
        with self.assertRaisesRegex(ValueError, 'новый выходной'):
            renderer.render(manifest, self.root, output)
        # Check mode never produces the requested output.
        checked = self.root / 'checked.mp4'
        with contextlib.redirect_stdout(io.StringIO()):
            renderer.render(manifest, self.root, checked, check_only=True)
        self.assertFalse(checked.exists())


if __name__ == '__main__':
    unittest.main()
