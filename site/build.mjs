// Builds the Stillflame website into ./dist (plain HTML, CSS and self-hosted fonts, no scripts).
//   node build.mjs             preview build: drafts are allowed and clearly marked
//   node build.mjs --release   refuses to build while the legal text still has placeholders
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const dist = path.join(here, "dist");
const release = process.argv.includes("--release");

const config = JSON.parse(readFileSync(path.join(here, "config.json"), "utf8"));
const guidelines = JSON.parse(readFileSync(path.join(here, "guidelines.json"), "utf8"));
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ---- Legal text -------------------------------------------------------------------------
const withEmail = (md) => md.replaceAll("{{supportEmail}}", config.supportEmail || "(support email to come)");
const legal = {
  privacy: withEmail(readFileSync(path.join(root, "docs/legal/privacy-policy.md"), "utf8")),
  terms: withEmail(readFileSync(path.join(root, "docs/legal/terms.md"), "utf8")),
};

/** Things that must be gone before anything legal goes public. */
function problems() {
  const found = [];
  for (const [name, md] of Object.entries(legal)) {
    const plain = md.replace(/\[[^\]]*\]\([^)]*\)/g, ""); // ignore markdown links
    for (const m of plain.matchAll(/\[[^\]\n]+\]/g)) found.push(`${name}: unresolved placeholder ${m[0].slice(0, 70)}`);
    if (/DRAFT|Draft for legal review/i.test(md)) found.push(`${name}: still marked as a draft`);
  }
  if (!config.supportEmail) found.push("config.json: supportEmail is empty");
  return found;
}

const issues = problems();
if (release && issues.length) {
  console.error(`Not building a release. ${issues.length} thing(s) to finish first:\n` + issues.map((i) => `  - ${i}`).join("\n"));
  process.exit(1);
}
if (!release && issues.length) console.warn(`Preview build with ${issues.length} open item(s) (a release build would refuse). Run with --release to list them.`);

// ---- Page shell --------------------------------------------------------------------------
const email = config.supportEmail || "support email to come";
const emailLink = config.supportEmail ? `<a href="mailto:${esc(config.supportEmail)}">${esc(config.supportEmail)}</a>` : esc(email);

function page({ title, description, body, draft = false, hero = false }) {
  const full = title === config.name ? `${config.name}. ${config.tagline}` : `${title} | ${config.name}`;
  const header = `<header class="site-header wrap">
      <a class="brand" href="/" aria-label="${config.name} home"><img src="/assets/logo-mark.png" alt="" width="38" height="38"><span>Still<b>flame</b></span></a>
      <nav aria-label="Main"><a href="/#how">How it works</a><a href="/guidelines/">Guidelines</a><a href="/privacy/">Privacy</a></nav>
    </header>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(full)}</title>
<meta name="description" content="${esc(description)}">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#0F3D3A">
${draft ? '<meta name="robots" content="noindex">' : ""}
<meta property="og:title" content="${esc(full)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<link rel="icon" href="/assets/favicon.png">
<link rel="apple-touch-icon" href="/assets/icon.png">
<link rel="preload" href="/fonts/DMSans_400Regular.ttf" as="font" type="font/ttf" crossorigin>
<link rel="stylesheet" href="/style.css">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
${draft ? '<div class="draft-banner" role="note">Draft for legal review. Not final, do not rely on it.</div>' : ""}
${hero ? "" : header}
${body.replace("<!--HEADER-->", header)}
<footer class="site-footer"><div class="wrap">
  <div class="footer-row">
    <div class="footer-links"><a href="/privacy/">Privacy policy</a><a href="/terms/">Terms of use</a><a href="/guidelines/">Community guidelines</a></div>
    <div>Questions: ${emailLink}</div>
  </div>
  <p class="crisis">Stillflame is not an emergency or crisis service. If you or someone else is in danger, contact your local emergency number.</p>
  <p class="crisis">&copy; ${new Date().getFullYear()} ${config.name}</p>
</div></footer>
</body>
</html>
`;
}

// ---- Pages -------------------------------------------------------------------------------
const store = (label, name, href) =>
  href
    ? `<a class="store" href="${esc(href)}"><small>${label}</small><strong>${name}</strong></a>`
    : `<span class="store soon" aria-label="${name}, coming soon"><small>Coming soon</small><strong>${name}</strong></span>`;

const home = page({
  title: config.name,
  description: "Share what weighs on you and let people pray for you, quietly and anonymously. Or pray for someone else. No accounts, no ads, no chat.",
  hero: true,
  body: `<div class="hero">
  <div class="wrap">
    <!--HEADER-->
    <div class="hero-body">
      <h1>Someone prayed <em>for you.</em></h1>
      <p class="lead">Share what weighs on you. People will pray for you, quietly and anonymously. Even one prayer can be enough.</p>
      <div class="stores">${store("Download on the", "App Store", config.stores.ios)}${store("Get it on", "Google Play", config.stores.android)}</div>
    </div>
  </div>
</div>
<main id="main">
<section id="how"><div class="wrap">
  <h2>How it works</h2>
  <ol class="steps">
    <li class="step"><span class="num">1</span><h3>Ask</h3><p>Write what you would like prayer for, in your own words. Use a first name or a nickname. That is all we ask.</p></li>
    <li class="step"><span class="num">2</span><h3>Pray</h3><p>Open the list for your language, read a request, pray, and tap "I prayed". It takes a minute.</p></li>
    <li class="step"><span class="num">3</span><h3>Know</h3><p>You see how many people prayed for you, and get one quiet notification. Never who they are.</p></li>
  </ol>
</div></section>
<section class="promises"><div class="wrap">
  <h2>Quiet by design</h2>
  <div class="promise-grid">
    <div class="promise"><h3>Anonymous</h3><p>No sign-up, no email, no phone number. People see the name you choose and nothing else.</p></div>
    <div class="promise"><h3>No ads, no feed to scroll</h3><p>No chat, no followers, no likes. A short list of requests and a button.</p></div>
    <div class="promise"><h3>You stay in control</h3><p>Edit or delete a request whenever you like. One button in Settings erases everything.</p></div>
    <div class="promise"><h3>Looked after</h3><p>Requests can be reported, and we review reports quickly. Nothing you write is used for tracking or advertising.</p></div>
  </div>
</div></section>
<section><div class="wrap narrow">
  <h2>In six languages</h2>
  <p>English, Spanish, French, Romanian, Ukrainian and Russian. Each language has its own list, so people pray for requests they can read.</p>
  <div class="notice"><p><strong>Please note.</strong> Stillflame is not an emergency or crisis service, and nobody reads requests in real time. If you or someone else is in danger, contact your local emergency number.</p></div>
</div></section>
</main>`,
});

const guidelinesPage = page({
  title: guidelines.title,
  description: "The few simple rules that keep Stillflame a quiet, kind place.",
  body: `<main id="main" class="doc"><div class="wrap narrow">
  <h1>${esc(guidelines.title)}</h1>
  <p>${esc(guidelines.intro)}</p>
  <ol class="rules">${guidelines.rules.map((r) => `<li><span>${esc(r)}</span></li>`).join("")}</ol>
  <p>If you see a request that breaks these rules, use "Report" on it in the app.</p>
</div></main>`,
});

function legalPage(key, title, description) {
  let md = legal[key];
  if (release) md = md.replace(/^>.*Draft for legal review.*\n?/im, "").replace(/\s*\(DRAFT\)/i, "");
  const html = marked.parse(md, { gfm: true });
  return page({ title, description, draft: !release, body: `<main id="main" class="doc"><div class="wrap narrow">${html}</div></main>` });
}

// ---- Write -------------------------------------------------------------------------------
rmSync(dist, { recursive: true, force: true });
const write = (rel, content) => {
  const file = path.join(dist, rel);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
};
write("index.html", home);
write("guidelines/index.html", guidelinesPage);
write("privacy/index.html", legalPage("privacy", "Privacy policy", "What Stillflame collects, why, and how you can delete it."));
write("terms/index.html", legalPage("terms", "Terms of use", "The terms for using Stillflame."));
write("404.html", page({ title: "Page not found", description: "This page does not exist.", body: `<main id="main" class="doc"><div class="wrap narrow"><h1>Page not found</h1><p>That page does not exist. <a href="/">Back to the start</a>.</p></div></main>` }));
write("robots.txt", release ? `User-agent: *\nAllow: /\n` : `User-agent: *\nDisallow: /\n`);
cpSync(path.join(here, "src/style.css"), path.join(dist, "style.css"));

const fonts = path.join(root, "apps/mobile/node_modules/@expo-google-fonts");
const fontFiles = [
  ["fraunces/600SemiBold/Fraunces_600SemiBold.ttf"],
  ["fraunces/600SemiBold_Italic/Fraunces_600SemiBold_Italic.ttf"],
  ["dm-sans/400Regular/DMSans_400Regular.ttf"],
  ["dm-sans/500Medium/DMSans_500Medium.ttf"],
  ["dm-sans/700Bold/DMSans_700Bold.ttf"],
];
for (const [f] of fontFiles) {
  const src = path.join(fonts, f);
  if (!existsSync(src)) throw new Error(`Font missing: ${src} (run pnpm install)`);
  cpSync(src, path.join(dist, "fonts", path.basename(f)));
}
const images = path.join(root, "apps/mobile/assets/images");
for (const f of ["logo-mark.png", "favicon.png", "icon.png", "welcome-hero.jpg"]) cpSync(path.join(images, f), path.join(dist, "assets", f));

console.log(`Built ${release ? "RELEASE" : "preview"} site in ${path.relative(root, dist)}`);
