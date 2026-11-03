"""Regression checks for identity isolation and preserving the end of speech."""
import array
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import wave

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from prepare_avatar_project import prepare, ROOT
from render_avatar_clip import render
from render_newnews import probe


class AvatarTemplateTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.image = self.root / 'master.png'
        subprocess.run(['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i',
                        'color=c=navy:s=64x112', '-frames:v', '1', '-threads', '1',
                        str(self.image)], check=True)
        self.voice = self.root / 'voice.wav'
        # Silent start, clearly audible final 0.3 seconds; catches speech-tail loss.
        samples = array.array('h', [0]*7200 + [8000 if i % 40 < 20 else -8000 for i in range(2400)])
        with wave.open(str(self.voice), 'wb') as wav:
            wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(8000)
            wav.writeframes(samples.tobytes())

    def tearDown(self):
        self.tmp.cleanup()

    def test_new_identity_replaces_old_prompt_and_preserves_model_graph(self):
        profile = ROOT / 'templates/avatar-v1/avatar.profile.example.json'
        dest = self.root / 'new-avatar'
        prepare(profile, self.image, self.voice, self.image, dest)
        original = json.loads((ROOT/'workflows/newnews/infinite-talk-api.json').read_text())
        actual = json.loads((dest/'workflow.api.json').read_text())
        self.assertIn('male presenter', actual['21']['inputs']['text'])
        self.assertNotIn('brunette', actual['21']['inputs']['text'])
        for key in original:
            if key not in {'21', '22', '12'}:
                self.assertEqual(original[key], actual[key])
        original['12']['inputs']['seed'] = 20261104
        self.assertEqual(original['12'], actual['12'])
        with self.assertRaisesRegex(ValueError, 'never overwritten'):
            prepare(profile, self.image, self.voice, self.image, dest)

    def clip(self, duration):
        path = self.root / f'clip-{duration}.mp4'
        subprocess.run(['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i',
                        'testsrc2=size=64x112:rate=25', '-t', str(duration),
                        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', str(path)], check=True)
        return path

    def test_full_voice_tail_survives_short_video_and_intro(self):
        final = self.root / 'final.mp4'
        render(self.clip(1.0), self.voice, self.image, final)
        info = probe(final)
        v = next(s for s in info['streams'] if s['codec_type'] == 'video')
        self.assertEqual((v['width'], v['height'], v['r_frame_rate']), (1080, 1920, '30/1'))
        self.assertAlmostEqual(float(info['format']['duration']), 2.2, delta=0.08)
        raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(final),
                                       '-ss', '2.08', '-t', '0.1', '-f', 's16le',
                                       '-ar', '8000', '-ac', '1', '-'])
        samples = array.array('h'); samples.frombytes(raw)
        self.assertGreater(len(samples), 400)
        self.assertGreater(sum(abs(x) for x in samples)/len(samples), 3000)

    def test_large_missing_motion_tail_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'too short'):
            render(self.clip(0.4), self.voice, self.image, self.root/'bad.mp4')
        self.assertFalse((self.root/'bad.mp4').exists())


if __name__ == '__main__':
    unittest.main()
