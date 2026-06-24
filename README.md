# SplitPress

**Backend A/B testing for WordPress — no flicker, no redirect, no duplicate URLs.**

Most A/B testing tools swap content after the page has already started loading, causing a flash of the wrong version before the variant snaps in. Others serve each variant at a different URL, which splits link equity and leaves behind 404s when a test ends.

SplitPress works differently: variant assignment happens in PHP, before `wp_head`, so visitors always receive the correct version from the very first byte — at the same URL.

---

## How it works

1. A visitor requests a page.
2. The plugin checks the cached test manifest for an active test targeting that page.
3. A deterministic hash of the visitor ID and test ID assigns them to a variant — stably, across visits.
4. WordPress serves the variant post transparently. The URL never changes.
5. A lightweight tracker script fires behavioral events (page views, clicks, scroll depth, etc.) back through WordPress admin-ajax to the SplitPress API, keeping the API key off the browser entirely.

---

## Features

- **Server-side assignment** — variant chosen in PHP before any output
- **Same URL for all variants** — no SEO risk, no broken links after a test ends
- **Any page builder** — variants are real WordPress posts (Gutenberg, Elementor, Divi, Bricks, Classic Editor)
- **Goal types** — page reached, click, scroll depth, time on page, element view, form submission, video play (YouTube / Vimeo / HTML5), external events (GA4, GTM, Meta Pixel)
- **HMAC-signed API** — every request from the plugin is signed; the API key never reaches the browser
- **Manifest cache** — tests are cached in a WordPress transient; most page loads make zero external requests

---

## Requirements

- WordPress 6.0+
- PHP 7.4+
- A [SplitPress account](https://splitpress.app) (free tier available)

---

## Installation

**From WordPress.org (recommended)**

Search for **SplitPress** in *Plugins → Add New* and click *Install Now*.

**Manual**

1. Download the latest ZIP from the [Releases](https://github.com/linebloc/splitpress-plugin/releases) page.
2. Upload and activate via *Plugins → Add New → Upload Plugin*.

**Setup**

1. Create a free account at [splitpress.app](https://splitpress.app).
2. In the SplitPress dashboard go to *Settings → Sites* and copy your API key.
3. In WordPress admin go to *SplitPress → Settings*, paste the key, and save.

---

## Plugin architecture

```
splitpress.php              Bootstrap (headers, constants, autoloader)
src/
  Core/
    Plugin.php              Singleton — wires up all subsystems
    Activator.php           Activation / deactivation / uninstall hooks
    Assignor.php            Intercepts requests, assigns variants before wp_head
    Visitor.php             Anonymous visitor ID cookie (HttpOnly, SameSite=Lax)
    Options.php             Typed accessors for wp_options settings
    VariantCloner.php       Clones a post to create a variant
  Api/
    Client.php              HMAC-signed HTTP client (wp_remote_*)
    Manifest.php            Transient cache for the test manifest + REST flush endpoint
  Admin/
    AdminMenu.php           Registers the SplitPress admin menu
    SettingsPage.php        Settings form + connection test AJAX
    TestListPage.php        Mounts the React dashboard
    TestDetailPage.php      AJAX handlers for test actions (start, pause, end, apply winner)
    CreateTestPage.php      AJAX handlers for the test creation wizard
  PostTypes/
    VariantPostType.php     Hides variant posts from queries, sitemaps, REST, search
  Tracking/
    Tracker.php             Enqueues tracker.js + AJAX proxy for events
assets/
  js/
    tracker.js              Vanilla JS event tracker (no dependencies)
    dashboard.js            Compiled React admin dashboard
    variant-editor.js       Gutenberg plugin — locks editing of active variant posts
languages/                  POT + PO/MO files (English source, es_ES, pt_BR)
```

---

## Building the admin dashboard

The React dashboard source lives in `dashboard/` (a Vite project). The compiled output is committed to `assets/js/dashboard.js` and `assets/css/dashboard.css`.

```bash
cd dashboard
npm install
npm run build   # production build
npm run dev     # watch mode
```

---

## Contributing

Pull requests are welcome. For significant changes, please open an issue first to discuss the approach.

**Business logic belongs in the Laravel app, not here.** The plugin is intentionally a thin relay — it fetches a manifest, assigns visitors, and forwards events. Stats, billing, test configuration, and analytics live server-side at [splitpress.app](https://splitpress.app).

**PHP style**: WordPress Coding Standards via PHPCS.  
**JS style**: The tracker (`tracker.js`) is vanilla JS with no build step. The dashboard uses React + Vite.

---

## License

[GPL-2.0-or-later](https://www.gnu.org/licenses/gpl-2.0.html) © [SplitPress](https://splitpress.app)
