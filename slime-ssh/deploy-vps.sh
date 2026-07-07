#!/bin/sh
# ============================================================
# deploy slime-ssh to a fresh Ubuntu/Debian VPS, in one command.
#   ./deploy-vps.sh root@203.0.113.7            # slime on port 2222 (safe default)
#   ./deploy-vps.sh root@203.0.113.7 --port 22  # slime on 22, admin sshd moves to 2202
#
# what it does, in order:
#   1. copies this directory to /opt/slime-ssh on the VPS (tar over ssh,
#      no rsync needed; node_modules/ and data/ never leave the laptop)
#   2. installs docker if missing (get.docker.com)
#   3. (--port 22 only) moves the ADMIN sshd to port 2202 — verifies the
#      new port answers before the old one lets go, so you cannot be
#      locked out mid-flight
#   4. builds the image and runs the container (restart unless-stopped,
#      host key + visitor counter persisted in the slime-ssh-data volume)
#   5. smoke-tests it: ssh visitor@<vps> whoami must answer in character
#
# after --port 22, admin access becomes:  ssh -p 2202 root@<vps>
# ============================================================
set -e

HOST="$1"
PORT=2222
[ "$2" = "--port" ] && PORT="$3"
if [ -z "$HOST" ]; then
  echo "usage: $0 <user@vps-ip> [--port 22|2222]" >&2
  exit 1
fi

SRC_DIR="$(cd "$(dirname "$0")" && pwd)"
SSH="ssh -o StrictHostKeyChecking=accept-new $HOST"

echo "→ 1/5 copying source to $HOST:/opt/slime-ssh"
tar -C "$SRC_DIR" -cz --exclude node_modules --exclude data --exclude .wrangler . \
  | $SSH 'mkdir -p /opt/slime-ssh && tar -xz -C /opt/slime-ssh'

echo "→ 2/5 ensuring docker is installed"
$SSH 'command -v docker >/dev/null 2>&1 || (curl -fsSL https://get.docker.com | sh)'

if [ "$PORT" = "22" ]; then
  echo "→ 3/5 moving ADMIN sshd from 22 to 2202 (slime takes the front door)"
  $SSH 'grep -qE "^Port 2202" /etc/ssh/sshd_config || {
    sed -i "s/^#\?Port .*/Port 2202/" /etc/ssh/sshd_config
    grep -qE "^Port " /etc/ssh/sshd_config || echo "Port 2202" >> /etc/ssh/sshd_config
    (command -v ufw >/dev/null && ufw allow 2202/tcp) || true
    systemctl restart sshd || systemctl restart ssh
  }'
  # prove the new admin door opens before we hand 22 to the slime
  ssh -o StrictHostKeyChecking=accept-new -p 2202 "$HOST" 'echo admin-door-2202-ok'
else
  echo "→ 3/5 admin sshd untouched (slime rides port $PORT)"
fi

echo "→ 4/5 building + running the container"
$SSH "cd /opt/slime-ssh && docker build -t slime-ssh . && \
  docker rm -f slime-ssh 2>/dev/null; \
  docker run -d --name slime-ssh --restart unless-stopped \
    -p $PORT:2222 -v slime-ssh-data:/data slime-ssh && sleep 2 && docker logs slime-ssh | tail -2"

echo "→ 5/5 smoke test (one-shot whoami, as a visitor would)"
VPS_ADDR="${HOST#*@}"
ssh -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=/tmp/slime-kh-$$ \
  -p "$PORT" "visitor@$VPS_ADDR" whoami
rm -f "/tmp/slime-kh-$$"

echo ""
echo "🐳 deployed. visitors enter with:"
if [ "$PORT" = "22" ]; then
  echo "    ssh $VPS_ADDR"
  echo "  (admin access is now: ssh -p 2202 $HOST)"
else
  echo "    ssh ssh://slime@$VPS_ADDR:$PORT"
fi
echo "  next: update the Worker /hi afterscene + the GitHub profile command."
