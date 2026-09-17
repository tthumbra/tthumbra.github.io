#!/usr/bin/env bash
# Deploy site/ to the Raspberry Pi. For WSL, Linux, macOS, or Git Bash
# with rsync available. On plain Windows use deploy.ps1 instead.
#
#   ./deploy.sh
#   PI_HOST=pi@192.168.1.50 ./deploy.sh

set -euo pipefail

PI_HOST="${PI_HOST:-pi@raspberrypi.local}"
WEB_ROOT="${WEB_ROOT:-/var/www/tanish}"
STAGING="${STAGING:-\$HOME/site-staging}"

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
site="$here/site"

[[ -d "$site" ]] || { echo "No site/ directory found next to this script." >&2; exit 1; }

echo "Deploying $site -> ${PI_HOST}:${WEB_ROOT}"

echo "  [1/3] preparing staging directory"
ssh "$PI_HOST" "rm -rf $STAGING && mkdir -p $STAGING"

echo "  [2/3] copying files"
# --delete so files removed locally are removed on the Pi too.
rsync -az --delete "$site/" "${PI_HOST}:${STAGING}/"

echo "  [3/3] publishing to web root"
ssh "$PI_HOST" "
	sudo mkdir -p $WEB_ROOT &&
	sudo rsync -a --delete $STAGING/ $WEB_ROOT/ &&
	sudo chown -R caddy:caddy $WEB_ROOT &&
	sudo find $WEB_ROOT -type d -exec chmod 755 {} + &&
	sudo find $WEB_ROOT -type f -exec chmod 644 {} +
"

echo "Done."
