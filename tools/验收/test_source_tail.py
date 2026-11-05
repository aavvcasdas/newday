import unittest
import numpy as np
from verify_episode import tail_check, original_source_tail_check
class OriginalTailTests(unittest.TestCase):
    def test_default_still_rejects_long_tail(self):
        with self.assertRaises(ValueError): tail_check(104.3,103.575)
    def test_verified_original_exception(self):
        t,p=original_source_tail_check(104.3,103.575,104.3,np.zeros((round(.725*44100),2)))
        self.assertAlmostEqual(t,.725);self.assertEqual(p['added_padding_seconds'],0)
    def test_cannot_pad_source(self):
        with self.assertRaises(ValueError): original_source_tail_check(104.3,103.575,104,np.zeros((32000,2)))
    def test_cannot_call_speech_silence(self):
        with self.assertRaises(ValueError): original_source_tail_check(104.3,103.575,104.3,np.ones((32000,2))*.01)
    def test_reject_missing_pcm(self):
        with self.assertRaises(ValueError): original_source_tail_check(104.3,103.575,104.3,np.zeros((20,2)))
