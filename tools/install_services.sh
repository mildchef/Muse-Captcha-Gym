#!/usr/bin/env bash
# Install + start the CAPTCHA Gym systemd units (server + tunnel).
# Unit sources live in ~/workspace/captcha-gym/systemd/ (persistent);
# copies go to /etc/systemd/system/ (ephemeral — re-run this script after
# a VM replacement to restore supervised hosting).
set -e
SRC="/home/hatch/workspace/captcha-gym/systemd"
install -m 644 "$SRC/captcha-gym.service" /etc/systemd/system/captcha-gym.service
install -m 644 "$SRC/captcha-gym-tunnel.service" /etc/systemd/system/captcha-gym-tunnel.service
chmod +x /home/hatch/workspace/captcha-gym/tools/tunnel.sh
systemctl daemon-reload
systemctl enable captcha-gym.service captcha-gym-tunnel.service
echo "Installed and enabled. Start with: systemctl start captcha-gym captcha-gym-tunnel"
echo "Current public URL (once the tunnel is up): cat /home/hatch/workspace/captcha-gym/LIVE_URL.txt"
