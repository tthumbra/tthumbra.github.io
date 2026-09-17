# Personal website — design

**Date:** 2026-09-16
**Status:** approved, implemented

## Goal

A personal site for Tanish Thumbraguddi that reads as deliberately made
rather than generated, and that runs on a Raspberry Pi behind a DuckDNS
domain over HTTPS.

## Decisions

| Area | Choice | Why |
|---|---|---|
| Sections | About, Projects, Contact | Chosen by user. No blog — nothing to put in it yet, and an empty blog ages badly. |
| Stack | Hand-written HTML + CSS | No build step, no dependencies, no runtime process on the Pi. Also the strongest signal the site wasn't machine-generated. |
| Serving | Caddy | Automatic Let's Encrypt certificates and renewal from a ~20 line config. nginx + certbot is more parts for the same result. |
| Look | Terminal / monospace | Chosen by user. |
| JavaScript | None | Nothing on the page needs it. Lets the CSP deny scripts outright. |

## Structure

- `site/index.html` — about, selected work (3), toolkit, contact
- `site/projects.html` — full projects, experience, education
- `site/404.html`
- `site/style.css` — single stylesheet, no preprocessor

About was folded into `index.html` rather than given its own page: the
copy is four paragraphs, and a dedicated page for four paragraphs reads
as padding.

## Visual approach

The terminal aesthetic has a well-populated failure mode — fake
interactive shells, typewriter animations, blinking cursors, neon green
on pure black, ASCII banners. All excluded deliberately.

What it does instead:

- **Fixed character-width column** (`72ch`). Because the font is
  monospace, every line wraps on the same character boundary and the
  page reads like a text file. This is the one real advantage of a
  monospace layout and all widths are kept in `ch` to preserve it.
- **System monospace stack**, no webfont — zero network requests for
  type, which matters on a Pi.
- **Amber-on-warm-black**, plus a genuine `prefers-color-scheme` light
  mode.
- **Section rules** are real `─` characters clipped by `overflow`, so
  they sit on the monospace grid instead of floating above it as a CSS
  border would.
- **The `$` prompt is a static label**, used once per page. It never
  pretends to accept input. The moment it simulates interactivity it
  stops being a design and becomes a costume.

## Deployment

Caddy serves `/var/www/tanish`. `deploy.ps1` (Windows) and `deploy.sh`
(WSL/Linux/macOS) copy `site/` to a staging directory on the Pi, then
publish into the web root with `rsync --delete`, so the web root is
never half-written mid-copy.

A systemd timer runs `duckdns-update.sh` every 5 minutes to keep the DNS
record on the current public IP.

### Known risk: port 80

Caddy proves domain ownership over inbound port 80 (HTTP-01). Two
conditions break this and neither is fixable in config: an ISP that
blocks port 80, and CGNAT. The README leads with a check for both and
documents the DNS-01 fallback (`xcaddy` build with the DuckDNS plugin),
which removes the port 80 requirement.

## Privacy decisions

- **Phone number excluded.** Present on the resume, deliberately not on
  a public page — a scrapeable number is a permanent spam magnet.
- **Resume PDF not committed.** The PDF contains the phone number, so
  publishing it to a public repo would undo the point above.
- **DuckDNS token never committed.** Read from `/etc/duckdns.conf`
  (mode 600) on the Pi; `.gitignore` covers stray copies.

## Deferred

- LinkedIn link — URL unknown, omitted rather than shipped broken.
  One-line HTML comment in `index.html` shows where it goes.
- Phone-scrubbed resume PDF for download.
- `codearenamvp`, `kalshi`, `SATprep` are recent local projects not on
  the resume and not described here, because writing them up would mean
  inventing details. Candidates for a second pass.
