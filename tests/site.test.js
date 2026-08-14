/**
 * Static regression checks for public pages, accessibility, analytics, and admin exports.
 * Run: node tests/site.test.js
 */
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const publicPages = ["index.html", "booking.html", "gallery.html", "attractions.html", "local.html"];
for (const page of publicPages) {
  const html = read(page);
  assert.match(html, /<html lang="th">/, page + " must declare Thai document language");
  assert.match(html, /<meta name="description"/, page + " must have a meta description");
  assert.match(html, /<link rel="canonical"/, page + " must have a canonical URL");
  assert.match(html, /assets\/ui\.js/, page + " must load shared UI and page-view analytics");
}

const ui = read("assets/ui.js");
assert.match(ui, /\/_vercel\/insights\/script\.js/, "public analytics script must be injected");
assert.match(ui, /role", "dialog"/, "home lightbox must expose dialog semantics");
assert.match(ui, /img\.tabIndex = 0/, "home gallery images must be keyboard focusable");

const gallery = read("gallery.html");
assert.match(gallery, /role="button" tabindex="0"/, "gallery cards must be keyboard focusable");
assert.match(gallery, /e\.key === "Enter" \|\| e\.key === " "/, "gallery must open with keyboard");
assert.match(gallery, /lbTrigger.*focus/s, "gallery must restore focus after closing");

const admin = read("admin/index.html");
assert.doesNotMatch(admin, /URLSearchParams\(location\.search\).*get\("key"\)/s, "admin key must not be accepted from URL");
assert.doesNotMatch(admin, /_vercel\/insights/, "admin must not load public analytics");
assert.match(admin, /role="dialog" aria-modal="true"/, "admin modals must expose dialog semantics");
assert.match(admin, /function safeCsvCell/, "CSV exports must sanitize spreadsheet formulas");
assert.match(admin, /id="csvSummary"/, "monthly summary export must be available");

console.log("SITE TESTS PASSED");
