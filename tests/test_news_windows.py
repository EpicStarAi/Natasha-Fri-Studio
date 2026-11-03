import array
import copy
import math
from pathlib import Path
import json
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
import render_newnews as render
from news_windows import validate_windows


def cue(identifier, filename, start, end):
    return {'id': identifier, 'asset': filename, 'startSeconds': start, 'endSeconds': end,
            'mediaStartSeconds': 0, 'headline': 'ТЕСТ ОКНА', 'label': 'АРХИВ',
            'credit': 'Источник: тест', 'sourceUrl': 'https://example.org/media', 'anchorText': 'Фраза'}


class NewsWindowsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory(); cls.root = Path(cls.tmp.name)
        base = ['ffmpeg', '-v', 'error', '-y']
        for name, color in [('intro.png','black'),('red.png','red')]:
            render.run(base+['-f','lavfi','-i',f'color={color}:s=356x200','-frames:v','1',str(cls.root/name)])
        for name, color, freq in [('host.mp4','green',440),('blue.mp4','blue',880)]:
            render.run(base+['-f','lavfi','-i',f'color={color}:s=360x640:r=30','-f','lavfi','-i',f'sine=frequency={freq}:sample_rate=48000','-t','3','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac',str(cls.root/name)])

    @classmethod
    def tearDownClass(cls): cls.tmp.cleanup()

    def validate(self, windows):
        return validate_windows({'windows':windows},self.root,3,render.asset,render.probe,render.IMAGES,render.VIDEOS)

    def test_invalid_timing_and_external_asset_are_rejected(self):
        first = cue('one','red.png',0,1)
        for change in [{'endSeconds':3.2},{'startSeconds':float('nan')},{'asset':'../red.png'},{'sourceUrl':'javascript:alert(1)'},{'endSeconds':0.1}]:
            with self.subTest(change=change), self.assertRaises(ValueError): self.validate([{**first,**change}])
        with self.assertRaisesRegex(ValueError,'перекрывают'): self.validate([first,cue('two','blue.mp4',0.5,2)])

    def test_short_source_video_is_not_silently_looped_or_frozen(self):
        with self.assertRaisesRegex(ValueError,'короче'):
            self.validate([{**cue('one','blue.mp4',0,2),'mediaStartSeconds':2}])

    def test_real_render_switches_image_video_and_preserves_only_host_audio(self):
        scene = {'narration':'Тест проверяет окна и непрерывную речь ведущей.', 'sourceUrls':['https://example.org'],
                 'presenterAsset':'host.mp4','brollAsset':'', 'windows':[cue('one','red.png',0.3,1.1),cue('two','blue.mp4',1.3,2.1)]}
        pack = {'schemaVersion':1,'channel':{'id':'newnews-rus','format':render.FORMAT},'introAsset':'intro.png','scenes':[scene]}
        manifest=self.root/'episode.json';manifest.write_text(json.dumps(pack))
        output=self.root/'final.mp4'; report=render.render(manifest,self.root,output)
        self.assertAlmostEqual(report['actualDurationSeconds'],4,delta=0.15)
        colors=[]
        for second in [1.65,2.17,2.65,3.6]:
            raw=subprocess.check_output(['ffmpeg','-v','error','-ss',str(second),'-i',str(output),'-vf','crop=2:2:200:300','-frames:v','1','-f','rawvideo','-pix_fmt','rgb24','-'])
            colors.append(tuple(raw[:3]))
        for pixel, dominant in zip(colors,[0,1,2,1]):
            self.assertGreater(pixel[dominant],70)
            self.assertGreater(pixel[dominant],max(v for i,v in enumerate(pixel) if i!=dominant)*2)
        raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(output),'-ss','2.4','-t','0.4','-f','s16le','-ar','8000','-ac','1','-'])
        samples=array.array('h');samples.frombytes(raw)
        def energy(freq):
            return sum(x*math.cos(2*math.pi*freq*n/8000) for n,x in enumerate(samples))**2+sum(x*math.sin(2*math.pi*freq*n/8000) for n,x in enumerate(samples))**2
        self.assertGreater(energy(440),energy(880)*50)


if __name__=='__main__':unittest.main()
