=== SplitEvo ===
Contributors: linebloc, rodrigomantoan
Tags: a/b testing, split testing, conversion optimization, cro, experiments
Requires at least: 6.0
Tested up to: 7.0
Requires PHP: 7.4
Stable tag: 0.9.1
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Backend A/B testing for WordPress. Variant assignment happens server-side — no flicker, no JavaScript redirects, no duplicate URLs.

== Description ==

**SplitEvo picks the variant on the server before the page loads** — so visitors never see a flash of the wrong content, and every variant lives at the same URL.

Most A/B testing tools swap content using JavaScript after the page has already started rendering. That causes a brief "flash" of the original before the variant snaps in. Others create separate URLs for each variant, which introduces duplicate content risks and leaves behind 404s when a test ends.

SplitEvo works differently:

* **Server-side assignment** — the variant is chosen in PHP, before `wp_head`, so the correct version is served from the very first byte.
* **Same URL for every variant** — no duplicate pages, no SEO risk, no broken links when a test ends.
* **No flicker** — visitors always see exactly one version of the page.
* **Any page builder** — variants are real WordPress posts, editable with Gutenberg, Elementor, Divi, Bricks, or the Classic Editor.
* **Lightweight tracker** — a small vanilla JS file (no framework, no jQuery) tracks page views, clicks, scroll depth, time on page, form submissions, and video plays. Events are proxied through WordPress admin-ajax so the API key never touches the browser.

= Goal types =

* **Page reached** — fire a conversion when a visitor lands on a specific URL pattern.
* **Click** — track clicks on any CSS selector or specific URLs on the page.
* **Scroll depth** — fire at 25%, 50%, 75%, or 100% scroll milestones.
* **Time on page** — fire at 10s, 30s, or 60s milestones.
* **Element view** — fire when a specific element scrolls into the viewport (IntersectionObserver).
* **Form submission** — track any form (Contact Form 7, WPForms, Gravity Forms, native HTML).
* **Video play** — track first play of YouTube, Vimeo, or HTML5 video.
* **External event** — fire a conversion from GA4, GTM, Meta Pixel, or any custom JavaScript via `window.SplitEvo.trackEvent()`.

= Plans =

SplitEvo is a hosted service. A free plan is available with no credit card required. See [splitevo.app/pricing](https://splitevo.app/pricing) for current plan details.

= Source code =

The plugin admin dashboard (`assets/js/dashboard.js`) is compiled from a React/Vite source project. The full source is available at [https://github.com/linebloc/splitpress-plugin](https://github.com/linebloc/splitpress-plugin) under the same GPL-2.0-or-later license.

== Installation ==

1. In your WordPress admin, go to **Plugins → Add New**, search for "SplitEvo", and click **Install Now**, then **Activate**.
2. Create a free account at [splitevo.app](https://splitevo.app).
3. In the SplitEvo dashboard go to **Settings → Sites** and copy your site's API key.
4. In your WordPress admin go to **SplitEvo → Settings** and paste the API key.
5. Click **Save Settings**. SplitEvo will connect to your account immediately.

To create your first test, go to **SplitEvo → A/B Tests → New Test**, select the page or post you want to test, and duplicate it as a variant. Edit the variant with any page builder, then activate the test.

== Frequently Asked Questions ==

= Does this require a paid subscription? =

No. We have Free plan, which includes 1 website, 1 concurrent active test, and 500 tracked visitors per month with no credit card required. Sign up at [splitevo.app](https://splitevo.app).

= Will it slow down my site? =

Minimal impact. The test manifest is cached in a WordPress transient and refreshed every 5 minutes, so no external API call is made on the vast majority of page loads. The front-end tracker script is deferred and only loaded on pages with an active test.

= Does it work with my page builder? =

Yes. Variants are real WordPress posts, so they work with any builder that edits standard posts or pages: Gutenberg, Elementor, Divi, Bricks, Oxygen, or the Classic Editor. SplitEvo creates a hidden clone of your original post for each variant and serves it at the same URL.

= Is it compatible with caching plugins? =

Because SplitEvo assigns variants server-side, full-page caching can interfere — a cached page will serve the same variant to all visitors. SplitEvo will show a warning in the admin when it detects WP Rocket, W3 Total Cache, WP Super Cache, LiteSpeed Cache, WP Fastest Cache, or SiteGround Optimizer. Exclude your test pages from the cache or configure a bypass rule in your cache plugin.

= Will running tests affect my SEO? =

No. All variants are served at the same URL — Google only ever crawls one version of the page. When a test ends, variant posts are cleaned up automatically. No duplicate content, no 404s.

= Does this work on WordPress Multisite? =

Not yet. Multisite support is planned for a future release.

= Where is visitor data stored? =

All event and visitor data is stored on SplitEvo servers (splitevo.app). See the Privacy Policy section for details on what data is collected.

= Can I self-host the SplitEvo API? =

The SplitEvo API is currently a hosted-only service. If you are interested in self-hosted options please contact us at [splitevo.app](https://splitevo.app).

== External Services ==

This plugin connects to the **SplitEvo** hosted service at https://splitevo.app to provide its core functionality. By using this plugin you are agreeing to the SplitEvo Terms of Service and Privacy Policy.

**When the plugin contacts splitevo.app:**

* On the first frontend page load after the transient expires (every ~5 minutes per site), to fetch the active test manifest.
* When a visitor triggers a tracked event (page view, click, scroll, etc.), to record analytics. Events are batched and sent through WordPress admin-ajax — the API key never reaches the browser.
* When you click "Test connection" in the plugin settings.
* When you create, update, pause, or delete a test from the WordPress admin.
* When the SplitEvo app pushes a cache-invalidation signal (e.g. after a test change).

**Data transmitted to splitevo.app:**

* An anonymous visitor ID (a random token stored in a first-party cookie — not linked to any personal identity).
* The current page URL.
* Test and variant identifiers.
* Behavioral events: page view, goal page reached, click, scroll depth, time on page, element view, form submission, video play.

No IP addresses, names, email addresses, or other personally identifying information are transmitted from the plugin to the SplitEvo API.

* [Terms of Service](https://splitevo.app/terms)
* [Privacy Policy](https://splitevo.app/privacy)

When a test includes a **Video Play** goal, the plugin also loads third-party scripts conditionally:

* YouTube IFrame API — `https://www.youtube.com/iframe_api` — loaded only when a YouTube iframe is present on the page and a video-play goal is active.
* Vimeo Player SDK — `https://player.vimeo.com/api/player.js` — loaded only when a Vimeo iframe is present on the page and a video-play goal is active.

These scripts are subject to YouTube's ([Terms](https://www.youtube.com/t/terms) / [Privacy Policy](https://policies.google.com/privacy)) and Vimeo's ([Terms](https://vimeo.com/terms) / [Privacy Policy](https://vimeo.com/privacy)) respectively.

== Privacy Policy ==

= Cookies =

When a visitor arrives on a page with an active A/B test, SplitEvo sets a first-party cookie named `splitevo_vid` containing a random anonymous visitor ID. This cookie:

* Is `HttpOnly` (not accessible to JavaScript).
* Uses `SameSite=Lax`.
* Is set as `Secure` on HTTPS sites.
* Expires after 1 year.
* Contains no personally identifying information.

The cookie is used solely to assign the same visitor to the same variant on repeat visits (stable assignment).

= Data sent to splitevo.app =

The following data is sent to the SplitEvo API (https://splitevo.app):

* The anonymous `splitevo_vid` visitor ID.
* The URL of the current page.
* The active test ID and the assigned variant ID.
* Behavioral events: page view, goal-page reached, click, scroll depth, time on page, element in viewport, form submission, video play.

No IP addresses, names, email addresses, or other personally identifying information are included in these transmissions.

= Responsibility of site owners =

If your visitors are located in the EU or other regions governed by privacy regulations (GDPR, ePrivacy, CCPA, LGPD, etc.) you are responsible for disclosing this data collection in your site's Privacy Policy and, where applicable, obtaining visitor consent before SplitEvo runs.
SplitEvo does not provide a built-in consent mechanism — use a consent management tool to conditionally load the plugin based on visitor consent if required.

== Changelog ==

= 0.9.1 =
* Initial release.
