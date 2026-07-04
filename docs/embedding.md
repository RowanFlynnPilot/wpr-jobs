# Embedding the board in WordPress (Newspack)

Same approach as wpr-community-board: an iframe pointing at the GitHub
Pages build, plus a small script that (a) keeps the iframe exactly as tall
as the board and (b) forwards shared-job links into the iframe.

Create a full-width page in WordPress (suggested slug: `/jobs`), add a
**Custom HTML** block, and paste:

```html
<iframe
  id="wpr-jobs"
  src="https://rowanflynnpilot.github.io/wpr-jobs/"
  title="Now Hiring in Marathon County — Wausau Pilot &amp; Review"
  style="width:100%;border:0;display:block;"
  height="1200"
  allow="clipboard-write"
  loading="lazy"
></iframe>
<script>
  (function () {
    var frame = document.getElementById('wpr-jobs');

    // Deep links: a shared job URL is this page plus '#/job/<id>'. The
    // fragment stays on the parent page, so pass it into the iframe — the
    // board opens that card and scrolls it into view.
    if (location.hash.indexOf('#/job/') === 0 || location.hash.indexOf('#/post') === 0) {
      frame.src += location.hash;
    }

    // Auto-height: the app posts its height on every resize.
    window.addEventListener('message', function (event) {
      if (event.data && event.data.type === 'wpr-jobs-height') {
        frame.height = event.data.height;
      }
    });
  })();
</script>
```

After the page exists, set the repo **Actions variable** `VITE_PUBLIC_URL`
(Settings → Secrets and variables → Actions → Variables) to the page's URL,
e.g. `https://wausaupilotandreview.com/jobs/`. From the next deploy, every
Copy-link share points readers at the WordPress page instead of the raw
GitHub Pages URL.

Notes:

- `allow="clipboard-write"` is required for the Copy link button's one-click
  copy inside a cross-origin iframe. If a browser still refuses, the board
  falls back to opening the link in a new tab.
- Employers can be sent straight to the form:
  `https://wausaupilotandreview.com/jobs/#/post` (the script above forwards
  `#/post` into the iframe too).
- Deep links are newsletter-ready: link to
  `.../jobs/#/job/<id>` and the board opens with that card scrolled into
  view. The id is in every Copy link.
- The `#/admin` desk is on the same deployment — never link it from the
  site; it's the newsroom's bookmark.
