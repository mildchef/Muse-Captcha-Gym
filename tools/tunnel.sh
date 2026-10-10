#!/usr/bin/env bash
# CAPTCHA Gym public tunnel supervisor helper.
# Runs the localhost.run reverse tunnel in the foreground (via the VM's
# HTTP-CONNECT egress relay) and records the current public URL in
# ~/workspace/captcha-gym/LIVE_URL.txt whenever a (new) subdomain appears.
# Managed by the captcha-gym-tunnel systemd unit; Restart=always relaunches
# this script when the tunnel drops, and the fresh URL lands in LIVE_URL.txt.
set -o pipefail

# systemd services start with a clean environment; the egress-proxy settings
# that connect_relay.py reads (https_proxy) live in the login profile script.
if [ -z "${https_proxy:-}" ] && [ -r /etc/profile.d/hatch-egress.sh ]; then
  . /etc/profile.d/hatch-egress.sh
fi

GYM_DIR="/home/hatch/workspace/captcha-gym"
URL_FILE="$GYM_DIR/LIVE_URL.txt"
LOG_FILE="$GYM_DIR/data/tunnel.log"
mkdir -p "$GYM_DIR/data"

ssh -n \
  -i /home/hatch/.ssh/id_ed25519 \
  -o IdentitiesOnly=yes \
  -o ProxyCommand="python3 /home/hatch/workspace/tools/connect_relay.py %h %p" \
  -o StrictHostKeyChecking=accept-new \
  -o ServerAliveInterval=20 \
  -o ServerAliveCountMax=3 \
  -o ExitOnForwardFailure=yes \
  -R 80:127.0.0.1:8931 \
  localhost.run 2>&1 | while IFS= read -r line; do
    printf '%s %s\n' "$(date -u +%FT%TZ)" "$line" >> "$LOG_FILE"
    url="$(printf '%s' "$line" | grep -oE 'https://[a-z0-9]+\.lhr\.life' | head -n 1)"
    if [ -n "$url" ] && [ "$url" != "$(cat "$URL_FILE" 2>/dev/null)" ]; then
      printf '%s\n' "$url" > "$URL_FILE"
    fi
  done
