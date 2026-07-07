#!/bin/sh
# first boot: mint the container's host key into the /data volume.
# stable key = repeat visitors never see a MITM warning.
set -e
if [ ! -f "$HOST_KEY" ]; then
  ssh-keygen -t ed25519 -f "$HOST_KEY" -N "" -C "slime-docker" >/dev/null
  echo "🔑 minted new host key at $HOST_KEY"
fi
exec node /app/server.js
