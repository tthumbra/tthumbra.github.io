# Personal site

Static personal site for Tanish Thumbraguddi. Three HTML files and one
stylesheet, served from a Raspberry Pi over HTTPS via a DuckDNS domain.

No framework, no build step, no JavaScript, no runtime. The Pi is doing
nothing but reading files off disk and handing them to Caddy.

```
site/                   everything that ships to the Pi
  index.html            about, selected work, contact
  projects.html         projects, experience, education
  404.html
  style.css
  assets/
deploy/
  Caddyfile             TLS + static serving config
  duckdns-update.sh     keeps the DNS record on your current IP
  duckdns.conf.example  template for the (uncommitted) token file
  duckdns-update.service
  duckdns-update.timer
deploy.ps1              push site/ to the Pi from Windows
deploy.sh               same, for WSL / Linux / macOS
```

## Local preview

No build step, so you can just open `site/index.html` in a browser.
The only caveat: the nav links are root-absolute (`/projects.html`), so
they won't resolve from `file://`. To check navigation, serve the folder:

```powershell
cd site
python -m http.server 8000
# then open http://localhost:8000
```

---

## Pi setup, start to finish

Assumes Raspberry Pi OS (64-bit) and that you can already SSH in.

### 1. Check that you can actually host from home

Do this **first**. Two common situations make self-hosting impossible
without a tunnel, and both are worth discovering now rather than after
an hour of configuration.

Find your public IP, then compare it to the WAN IP shown in your
router's admin page:

```bash
curl -s https://api.ipify.org; echo
```

If they don't match, you are behind **CGNAT** — your ISP is sharing one
public IP across many customers, and no amount of port forwarding will
work. Options: ask the ISP for a public IP (sometimes free, sometimes
not offered), or use a tunnel (Cloudflare Tunnel, Tailscale Funnel)
instead of the port-forwarding approach below.

If they match, you also want to know whether inbound **port 80** is
reachable, since that is how Caddy will prove domain ownership. Some
ISPs block it on residential lines. You can test it after step 4.

### 2. DuckDNS

Create your subdomain at <https://www.duckdns.org> and copy the token.

```bash
sudo mkdir -p /opt/duckdns
sudo cp deploy/duckdns-update.sh /opt/duckdns/
sudo chmod 755 /opt/duckdns/duckdns-update.sh

sudo cp deploy/duckdns.conf.example /etc/duckdns.conf
sudo nano /etc/duckdns.conf          # set DUCKDNS_DOMAIN and DUCKDNS_TOKEN
sudo chown root:root /etc/duckdns.conf
sudo chmod 600 /etc/duckdns.conf     # the token is a password
```

Run it once by hand to confirm it works — it should print nothing and
append `OK` to the log:

```bash
sudo /opt/duckdns/duckdns-update.sh && tail -1 /var/log/duckdns.log
```

Then put it on a timer, so the record follows your IP when the ISP
rotates it:

```bash
sudo cp deploy/duckdns-update.{service,timer} /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now duckdns-update.timer
systemctl list-timers duckdns-update.timer
```

### 3. Give the Pi a fixed local IP

Port forwarding points at a LAN address. If DHCP hands the Pi a
different one next month, the forward silently points at nothing.
Set a DHCP reservation for the Pi's MAC address in your router, or
configure a static IP on the Pi.

### 4. Forward ports 80 and 443

In your router: forward external TCP **80** and **443** to the Pi's
local IP, same ports. Both are required —
443 serves the site, and 80 is what Let's Encrypt uses to verify you
control the domain.

Once forwarded, confirm port 80 is actually reachable from outside.
From a machine *not* on your home network (phone on cellular works):

```bash
curl -sS -m 10 -o /dev/null -w '%{http_code}\n' http://YOUR-SUB.duckdns.org/
```

Anything other than a timeout means packets are arriving. A timeout
after correct forwarding usually means the ISP blocks port 80 — skip to
[DNS-01 fallback](#if-port-80-is-blocked).

### 5. Install Caddy

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

### 6. Configure and start

Edit the domain on the first line of `deploy/Caddyfile` to your real
DuckDNS subdomain, then:

```bash
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile   # catch typos first
sudo mkdir -p /var/www/tanish /var/log/caddy
sudo chown caddy:caddy /var/log/caddy
sudo systemctl reload caddy
```

### 7. Deploy the site

From your PC:

```powershell
.\deploy.ps1 -PiHost pi@192.168.1.50
```

or from WSL / Linux / macOS:

```bash
PI_HOST=pi@192.168.1.50 ./deploy.sh
```

Then visit `https://your-sub.duckdns.org`. The first request will be
slow — Caddy is fetching a certificate. After that it's cached.

Watch it happen if something goes wrong:

```bash
sudo journalctl -u caddy -f
```

---

## If port 80 is blocked

Caddy's default verification needs inbound port 80. If your ISP blocks
it, switch to DNS-01 validation, which proves domain ownership by
writing a DNS record instead — no inbound ports needed at all.

It requires a Caddy binary built with the DuckDNS plugin, because the
stock package doesn't include DNS providers:

```bash
sudo apt install -y golang-go
go install github.com/caddyserver/xcaddy/cmd/xcaddy@latest
~/go/bin/xcaddy build --with github.com/caddy-dns/duckdns
sudo mv caddy "$(command -v caddy)"
```

Then add this inside the site block in `/etc/caddy/Caddyfile`:

```
tls {
    dns duckdns YOUR_DUCKDNS_TOKEN
}
```

and `sudo systemctl restart caddy`. You still need port 443 forwarded
for people to reach the site — DNS-01 only removes the port 80
requirement for certificates.

---

## Notes

- **The DuckDNS token is not in this repository** and must not be. It
  lives in `/etc/duckdns.conf` on the Pi, mode 600, and `.gitignore`
  excludes `duckdns.conf` so a stray copy here won't get committed.
- **No phone number on the site**, deliberately. A scrapeable phone
  number on a public page is a permanent spam magnet. Email only.
- **The CSP in the Caddyfile denies scripts entirely.** That is correct
  today and will block the first script you add. If you add one on
  purpose, loosen `default-src`/`script-src` at the same time.
