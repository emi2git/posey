#!/bin/sh
# Serve Posey at http://localhost:${PORT:-8000} like Cloudflare Pages does: clean URLs (/about -> about.html)
# and 404.html for unknown paths. (Camera needs localhost or HTTPS; for a phone use an HTTPS tunnel.)
cd "$(dirname "$0")" && exec python3 - "${PORT:-8000}" <<'PY'
import http.server, os, sys
from urllib.parse import urlsplit

class Handler(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        u = urlsplit(self.path)
        if u.path != "/" and not u.path.endswith("/") and not os.path.isfile(self.translate_path(u.path)) \
                and os.path.isfile(self.translate_path(u.path + ".html")):
            self.path = u.path + ".html" + (f"?{u.query}" if u.query else "")
        return super().send_head()

    def send_error(self, code, message=None, explain=None):
        if code == 404 and os.path.isfile("404.html"):
            body = open("404.html", "rb").read()
            self.send_response(404)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(body)
            return
        super().send_error(code, message, explain)

http.server.ThreadingHTTPServer(("", int(sys.argv[1])), Handler).serve_forever()
PY
