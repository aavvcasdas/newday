import hashlib
import http.client
import json
import threading
import unittest
from http.server import ThreadingHTTPServer
from model import FILES, SAMPLE, V2, data
from serve import Handler, byte_range

class ReviewTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def request(self, route, method='GET', headers=None):
        connection = http.client.HTTPConnection('127.0.0.1', self.server.server_port)
        connection.request(method, route, headers=headers or {})
        response = connection.getresponse()
        result = response.status, dict(response.getheaders()), response.read()
        connection.close()
        return result

    def test_sample_is_exact_current_v2_not_rejected_v1(self):
        model = data()
        self.assertEqual(hashlib.sha256(SAMPLE.read_bytes()).hexdigest(), model['sampleSha256'])
        self.assertFalse(model['fullV2Rendered'])
        self.assertFalse(model['humanApproved'])

    def test_latest_user_lyrics_and_partial_implementation(self):
        model = data()
        self.assertEqual(len(model['cues']), 16)
        self.assertEqual(model['cues'][1]['text'], '祈愿小世界里不只有挫败')
        self.assertEqual([c['line'] for c in model['cues'] if c['implemented']], list(range(6, 12)))
        self.assertEqual([c['text'] for c in model['cues']], (V2 / 'lyrics.txt').read_text().strip().splitlines())

    def test_trace_covers_each_frame_and_derives_all_shots(self):
        model = data()
        self.assertEqual(len(model['shots']), 11)
        self.assertEqual(model['frames'], 594)
        self.assertEqual(model['start'], 571 / 30)
        self.assertEqual(model['end'], 1165 / 30)
        for f in range(594):
            t = model['start'] + f / 30
            self.assertEqual(len([s for s in model['shots'] if s['start'] <= t < s['end']]), 1)
        for a, b in zip(model['shots'], model['shots'][1:]):
            self.assertEqual(a['end'], b['start'])

    def test_every_allowlisted_asset_exists(self):
        for route, path in FILES.items():
            self.assertTrue(path.is_file(), route)

    def test_api_uses_latest_lyrics(self):
        status, headers, body = self.request('/api/review')
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body)['cues'][1]['text'], '祈愿小世界里不只有挫败')
        self.assertEqual(headers['Cache-Control'], 'no-store')

    def test_no_repository_or_secret_access(self):
        for route in ['/.git/config', '/../../.git/config', '/%2e%2e/agent.md',
                      '/agent.md', '/docs/../serve.py', '/media/source.mp4/../x', '/index.html']:
            self.assertEqual(self.request(route)[0], 404, route)

    def test_seek_range_is_actual_file_bytes(self):
        status, headers, body = self.request('/media/sample.mp4', headers={'Range': 'bytes=101-199'})
        self.assertEqual(status, 206)
        self.assertEqual(body, SAMPLE.read_bytes()[101:200])
        self.assertEqual(int(headers['Content-Length']), 99)
        self.assertEqual(headers['Content-Range'], f'bytes 101-199/{SAMPLE.stat().st_size}')

    def test_suffix_and_open_ended_ranges(self):
        size = SAMPLE.stat().st_size
        for header, expected in [('bytes=-40', SAMPLE.read_bytes()[-40:]),
                                 (f'bytes={size-40}-', SAMPLE.read_bytes()[-40:])]:
            status, _, body = self.request('/media/sample.mp4', headers={'Range': header})
            self.assertEqual(status, 206)
            self.assertEqual(body, expected)

    def test_invalid_ranges_are_416(self):
        for value in ['bytes=-0', 'bytes=999999999-', 'bytes=20-10', 'bytes=0-1,4-8', 'bytes=-', 'garbage']:
            self.assertEqual(self.request('/media/sample.mp4', headers={'Range': value})[0], 416)

    def test_head_has_no_body_and_byte_size(self):
        status, headers, body = self.request('/media/sample.mp4', method='HEAD')
        self.assertEqual(status, 200)
        self.assertEqual(body, b'')
        self.assertEqual(int(headers['Content-Length']), SAMPLE.stat().st_size)

    def test_frontend_and_module_mime(self):
        for route in ['/', '/style.css', '/app.js', '/timeline.mjs']:
            status, headers, body = self.request(route)
            self.assertEqual(status, 200)
            self.assertTrue(body)
            if route.endswith('.mjs'):
                self.assertEqual(headers['Content-Type'], 'text/javascript')

    def test_range_parser(self):
        self.assertEqual(byte_range(None, 100), (0, 99, False))
        self.assertEqual(byte_range('bytes=20-999', 100), (20, 99, True))
        self.assertEqual(byte_range('bytes=-999', 100), (0, 99, True))
        with self.assertRaises(ValueError):
            byte_range('bytes=0-', 0)

if __name__ == '__main__':
    unittest.main(verbosity=2)
