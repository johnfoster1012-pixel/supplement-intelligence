import io
import unittest
from unittest.mock import patch
import check_sources

class SourceStatusTests(unittest.TestCase):
    def test_baseline_change_and_failure(self):
        u = 'https://example.org/paper'
        with patch('urllib.request.urlopen', return_value=io.BytesIO(b'a')):
            first = check_sources.check(u, None)
        self.assertEqual(first['status'], 'baseline')
        for body, expected in [(b'a','unchanged'), (b'b','changed_needs_review')]:
            with patch('urllib.request.urlopen', return_value=io.BytesIO(body)):
                self.assertEqual(check_sources.check(u, first['sha256'])['status'],expected)
        with patch('urllib.request.urlopen', side_effect=TimeoutError()):
            self.assertEqual(check_sources.check(u, first['sha256'])['status'],'unavailable_needs_review')
        self.assertNotIn('last_evidence_review',first)

if __name__=='__main__':
    unittest.main()
