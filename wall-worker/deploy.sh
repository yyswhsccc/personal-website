#!/usr/bin/env bash
# one-shot deploy: creates the KV namespace, sets secrets, ships the worker.
set -euo pipefail
cd "$(dirname "$0")"
echo "· creating KV namespace (idempotent-ish)…"
NS_JSON=$(npx --yes wrangler kv namespace create WALL 2>/dev/null || true)
NS_ID=$(npx --yes wrangler kv namespace list | python3 -c "import sys,json;ns=[n for n in json.load(sys.stdin) if 'yongshanos-wall' in n['title']];print(ns[0]['id'] if ns else '')")
[ -n "$NS_ID" ] || { echo "no namespace id"; exit 1; }
python3 - "$NS_ID" <<'PY'
import sys
s = open('wrangler.toml').read()
import re
s = re.sub(r'id = "[^"]*"', f'id = "{sys.argv[1]}"', s, count=1)
open('wrangler.toml','w').write(s)
PY
echo "· namespace: $NS_ID"
ADMIN=$(python3 -c "import secrets;print(secrets.token_urlsafe(24))")
SALT=$(python3 -c "import secrets;print(secrets.token_urlsafe(16))")
printf '%s' "$ADMIN" | npx --yes wrangler secret put ADMIN_SECRET
printf '%s' "$SALT"  | npx --yes wrangler secret put SALT
npx --yes wrangler deploy
echo ""
echo "=============================================="
echo "ADMIN_SECRET (save this somewhere safe!):"
echo "$ADMIN"
echo "=============================================="
