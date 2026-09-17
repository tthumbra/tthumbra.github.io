#!/usr/bin/env bash
# ===================================================================
#  Keeps the DuckDNS record pointed at this Pi's current public IP.
#
#  Home connections get a new IP whenever the ISP feels like it. Without
#  this running on a timer, your domain silently starts resolving to a
#  stranger's house and the site appears to be "down" for reasons that
#  have nothing to do with the Pi.
#
#  Install:  /opt/duckdns/duckdns-update.sh   (chmod 755)
#  Config:   /etc/duckdns.conf                (chmod 600, root-owned)
#
#  The token is read from the config file and is NEVER stored in this
#  script, because this script lives in a public git repository.
#  Anyone with your token can repoint your domain anywhere.
# ===================================================================

set -euo pipefail

CONFIG="${DUCKDNS_CONFIG:-/etc/duckdns.conf}"
LOG="${DUCKDNS_LOG:-/var/log/duckdns.log}"

if [[ ! -r "$CONFIG" ]]; then
	echo "duckdns: cannot read $CONFIG — copy duckdns.conf.example there and fill it in" >&2
	exit 1
fi

# Expects DUCKDNS_DOMAIN and DUCKDNS_TOKEN.
# shellcheck source=/dev/null
source "$CONFIG"

: "${DUCKDNS_DOMAIN:?not set in $CONFIG}"
: "${DUCKDNS_TOKEN:?not set in $CONFIG}"

# Leaving ip= empty tells DuckDNS to use the source IP of this request,
# which is exactly the public IP we want the record to hold.
response="$(
	curl -fsS --max-time 20 \
		"https://www.duckdns.org/update?domains=${DUCKDNS_DOMAIN}&token=${DUCKDNS_TOKEN}&ip=" \
		|| echo "REQUEST_FAILED"
)"

printf '%s  %s\n' "$(date --iso-8601=seconds)" "$response" >> "$LOG"

# DuckDNS answers "OK" or "KO". "KO" almost always means a bad token or
# a domain you don't own. Exit non-zero so cron/systemd surfaces it.
if [[ "$response" != "OK" ]]; then
	echo "duckdns: update failed (response: ${response})" >&2
	exit 1
fi
