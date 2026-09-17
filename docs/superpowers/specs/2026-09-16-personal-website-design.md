# Personal website — design

**Date:** 2026-09-16
**Status:** approved, implemented

## Goal

A personal site for Tanish Thumbraguddi that reads as deliberately made
rather than generated, and that is cheap to host and keep online.

## Decisions

| Area | Choice | Why |
|---|---|---|
| Sections | About, Projects, Contact | Chosen by user. No blog — nothing to put in it yet, and an empty blog ages badly. |
| Stack | Hand-written HTML + CSS | No build step, no dependencies, no server-side runtime. Also the strongest signal the site wasn't machine-generated. |
| Serving | GitHub Pages | Originally a Raspberry Pi behind DuckDNS + Caddy; dropped 2026-09-16. See below. |
| Look | Terminal / monospace | Chosen by user. |
| JavaScript | None | Nothing on the page needs it. |

## Structure

- `index.html` — about, selected work (3), toolkit, contact
- `projects.html` — full projects, experience, education
- `drone.html` — search-and-rescue drone write-up
- `404.html`
- `style.css` — single stylesheet, no preprocessor
- `assets/` — web-sized images

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

GitHub Pages, deploying from `main` at the repository root. Push is the
whole deploy process. The repo is named `tthumbra.github.io`, making it a
user site served at the domain root, so root-absolute links resolve.

### Superseded: Raspberry Pi + DuckDNS + Caddy

The original design self-hosted from a Raspberry Pi behind a DuckDNS
domain, with Caddy terminating TLS. That was removed on 2026-09-16 in
favour of GitHub Pages. The reasoning, recorded because the tradeoff is
worth remembering:

- **Fragility that config can't fix.** Caddy proves domain ownership over
  inbound port 80. An ISP that blocks port 80, or CGNAT, defeats that
  entirely — the fallback was a custom `xcaddy` build with the DuckDNS DNS
  plugin, which is a lot of machinery for a static site.
- **It publishes a home IP.** Anyone resolving the domain learns the
  residential address of the host. That is a real cost with no
  corresponding benefit here.
- **Uptime becomes a chore.** Power blips, ISP IP rotation, SD card wear.
  A no-JS static site gains nothing from a server it can be on the hook for.
- **`tanish.duckdns.org` is a worse URL** on a resume than
  `tthumbra.github.io`, and a bought domain via CNAME beats both.

What was lost: control over response headers. The Caddy config set a
strict CSP denying scripts outright; GitHub Pages allows no custom
headers. For a static site with no scripts and no external resources the
practical exposure is small, but it is a genuine reduction, not a wash.

## Privacy decisions

- **Phone number excluded.** Present on the resume, deliberately not on
  a public page — a scrapeable number is a permanent spam magnet.
- **Resume PDF not committed.** The PDF contains the phone number, so
  publishing it to a public repo would undo the point above.
- **No secrets in the repository.** Nothing the site needs is secret now
  that hosting is GitHub Pages.

## Deferred

- Phone-scrubbed resume PDF for download.
- `codearenamvp`, `kalshi`, `SATprep` are recent local projects not on
  the resume and not described here, because writing them up would mean
  inventing details. Candidates for a second pass.
