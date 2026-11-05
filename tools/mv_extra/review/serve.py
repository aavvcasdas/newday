"""Allowlisted local review server with byte ranges for seekable video. No write API."""
import argparse
import json
import mimetypes
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
from model import FILES, data

HERE = Path(__file__).resolve().parent
STATIC = {'/': HERE / 'index.html', '/app.js': HERE / 'app.js',
          '/style.css': HERE / 'style.css', '/timeline.mjs': HERE / 'timeline.mjs',
          '/review-sans.woff2': HERE / 'review-sans.woff2'}

def byte_range(header, size):
    """Single RFC 7233 range; reject unsatisfiable/malformed ranges explicitly."""
    if header is None:
        return 0, size - 1, False
    match = re.fullmatch(r'bytes=(\d*)-(\d*)', header.strip())
    if not match or not any(match.groups()) or size == 0:
        raise ValueError('Invalid range')
    first, last = match.groups()
    if first:
        start = int(first)
        end = min(int(last), size - 1) if last else size - 1
    else:
        length = int(last)
        if length <= 0:
            raise ValueError('Invalid suffix')
        start, end = max(0, size - length), size - 1
    if start >= size or start > end:
        raise ValueError('Unsatisfiable range')
    return start, end, True

class Handler(BaseHTTPRequestHandler):
    def do_HEAD(self):
        self.send_asset(head=True)

    def do_GET(self):
        self.send_asset(head=False)

    def send_asset(self, head):
        route = urlsplit(self.path).path
        if route == '/api/review':
            try:
                payload = json.dumps(data(), ensure_ascii=False).encode()
            except (OSError, ValueError, AssertionError) as exc:
                self.send_error(503, 'Review inputs unavailable')
                print('Review data error:', exc)
                return
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(payload)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            if not head:
                self.wfile.write(payload)
            return
        path = {**STATIC, **FILES}.get(route)
        if path is None or not path.is_file():
            self.send_error(404)
            return
        size = path.stat().st_size
        try:
            start, end, partial = byte_range(self.headers.get('Range'), size)
        except ValueError:
            self.send_response(416)
            self.send_header('Content-Range', f'bytes */{size}')
            self.send_header('Content-Length', '0')
            self.end_headers()
            return
        self.send_response(206 if partial else 200)
        mime = mimetypes.guess_type(path.name)[0] or 'application/octet-stream'
        if route.endswith('.mjs'):
            mime = 'text/javascript'
        self.send_header('Content-Type', mime)
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Content-Length', str(max(0, end - start + 1)))
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('X-Content-Type-Options', 'nosniff')
        if partial:
            self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.end_headers()
        if head:
            return
        try:
            with path.open('rb') as stream:
                stream.seek(start)
                remaining = end - start + 1
                while remaining > 0:
                    chunk = stream.read(min(256 * 1024, remaining))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    remaining -= len(chunk)
        except (BrokenPipeError, ConnectionResetError):
            pass  # User sought elsewhere or left the page.

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8000)
    args = parser.parse_args()
    server = ThreadingHTTPServer(('0.0.0.0', args.port), Handler)
    print(f'MV review listening on 0.0.0.0:{server.server_port}', flush=True)
    server.serve_forever()
