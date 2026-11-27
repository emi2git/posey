#!/bin/sh
# Serve Emi Form Check at http://localhost:${PORT:-8000}
# (Camera needs localhost or HTTPS; for a phone use an HTTPS tunnel or serve over HTTPS.)
cd "$(dirname "$0")" && exec python3 -m http.server "${PORT:-8000}"
