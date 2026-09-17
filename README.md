# tthumbra.github.io

Personal site for Tanish Thumbraguddi. Five HTML files and one
stylesheet, served by GitHub Pages.

No framework and no build step. Editing the site means editing HTML.

```
index.html      about, selected work, toolkit, contact
projects.html   projects, experience, education
drone.html      search-and-rescue drone write-up
demo.html       in-browser thermal classifier demo
404.html
style.css
assets/         images, model weights, demo.js, tf.min.js
```

## Local preview

There's no build step, so a plain file server is enough. The nav links
are root-absolute (`/projects.html`), so they won't resolve from a
`file://` URL — serve the directory instead:

```powershell
python -m http.server 8000
# http://localhost:8000
```

## Deploying

Push to `main`. That's the whole process.

```powershell
git add -A
git commit -m "..."
git push
```

GitHub Pages rebuilds within a minute or so. The repository is named
`tthumbra.github.io`, which makes it a **user site**, so it serves at
the domain root — `https://tthumbra.github.io/projects.html`, not
`/<repo>/projects.html`. That's why root-absolute links work.

### One-time setup

Repository **Settings → Pages → Build and deployment**:

- Source: **Deploy from a branch**
- Branch: **main**, folder: **/ (root)**

No Actions workflow is involved, which also means no `workflow` token
scope is needed to push.

### Custom domain, if you ever want one

Buy a domain, then add a `CNAME` file at the repository root containing
just the hostname:

```
tanishthumbraguddi.com
```

Point a `CNAME` DNS record at `tthumbra.github.io` (or `A` records at
GitHub's four Pages IPs for an apex domain). GitHub issues the TLS
certificate automatically. Tick **Enforce HTTPS** once it's provisioned.

## Notes

- **No phone number on the site**, deliberately. It's on the resume, but
  a scrapeable number on a public page is a permanent spam magnet.
- **GitHub Pages doesn't let you set response headers**, so there's no
  Content-Security-Policy here. Everything the demo loads is served from
  this repository, but it's still a real difference from a self-hosted
  setup where you control the headers.
- **Images** live in `assets/` and are pre-sized for the web. Re-encode
  anything new rather than committing straight off a camera.
