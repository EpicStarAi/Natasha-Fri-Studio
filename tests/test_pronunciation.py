import copy
import importlib.util
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from review_pronunciation import review, checked_engine_text, locale_of, check_studio_preparation


class PronunciationTest(unittest.TestCase):
    def test_unknown_locale_never_falls_back_to_russian(self):
        for locale in ['en', 'auto', 'ua', 'de-DE']:
            with self.assertRaises(ValueError):
                locale_of(locale)
        self.assertEqual(locale_of('uk'), 'uk-UA')

    @unittest.skipUnless(importlib.util.find_spec('ukrainian_word_stress'), 'install pronunciation dictionary')
    def test_uk_dictionary_ambiguity_and_language_scoped_override(self):
        report = review('Орбіту астероїда виміряти Діморф.', overrides={
            'ru-RU': {'Діморф': {'say': 'Дімо́рф', 'source': 'wrong language'}}})
        self.assertEqual(report['engineText'], 'Орбі́ту астеро́їда виміряти Діморф.')
        self.assertIn({'kind': 'ambiguous', 'word': 'виміряти'}, report['issues'])
        self.assertIn({'kind': 'unknown', 'word': 'Діморф'}, report['issues'])
        self.assertEqual(report['listeningReview'], 'pending')
        self.assertFalse(report['publicationReady'])

    @unittest.skipUnless(importlib.util.find_spec('ukrainian_word_stress'), 'install pronunciation dictionary')
    def test_changed_script_locale_and_corrupt_report_rejected(self):
        report = review('Орбіту астероїда.')
        self.assertEqual(checked_engine_text('Орбіту астероїда.', 'uk', report), 'Орбі́ту астеро́їда.')
        for text, locale in [('Орбіту астероїдів.', 'uk'), ('Орбіту астероїда.', 'ru')]:
            with self.assertRaises(ValueError):
                checked_engine_text(text, locale, report)
        corrupt = copy.deepcopy(report)
        corrupt['engineText'] += 'Зайвий текст.'
        with self.assertRaises(ValueError):
            checked_engine_text('Орбіту астероїда.', 'uk', corrupt)

    def test_uk_stress_markup_survives_adapter_input(self):
        check_studio_preparation('«орбі́та»', '"орбі́та"')
        for broken in ['орб+іта', 'орбіта', 'орби́та']:
            with self.assertRaises(ValueError):
                check_studio_preparation('орбі́та', broken)

    def test_russian_uses_only_russian_adapter(self):
        with patch('review_pronunciation.ru_review', return_value={
            'text': 'Орб+ита.', 'words': [{'word': 'Орб+ита', 'source': 'dictionary', 'doubt': False}]
        }) as adapter:
            result = review('Орбита.', 'ru-RU')
        adapter.assert_called_once()
        self.assertEqual(result['engineText'], 'Орби́та.')
        self.assertFalse(result['publicationReady'])

    def test_uk_english_does_not_use_american_dictionary(self):
        result = review('Hera.', 'en-GB', {'en-US': {'Hera': {'source': 'American only'}}})
        self.assertEqual(result['words'][0]['phonemes'], [])
        self.assertEqual(result['words'][0]['reference'], {})
        self.assertIn({'kind': 'unknown', 'word': 'Hera'}, result['issues'])

    @unittest.skipUnless(importlib.util.find_spec('cmudict'), 'install cmudict')
    def test_american_dictionary_reports_phonemes_without_passing_accent(self):
        result = review('News.', 'en-US')
        self.assertTrue(result['words'][0]['phonemes'])
        self.assertTrue(any(x['kind'] == 'accent_review' for x in result['issues']))
        self.assertFalse(result['publicationReady'])


if __name__ == '__main__':
    unittest.main()
