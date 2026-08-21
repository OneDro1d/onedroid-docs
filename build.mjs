// Build docs.onedroid.ai from the markdown in content/.
//
// The repo is the source of truth and the site is a build artefact. Push markdown, Vercel
// runs this, the site updates. There is exactly one copy of every sentence.
//
// Design constraints, in order:
//   1. Markdown source is served as-is at <page>.md, and to AI-agent user-agents at the
//      canonical URL. An agent reading these docs gets the original, not a reconstruction.
//   2. One dependency (marked). Every package here is a thing somebody has to patch.
//   3. No client-side JavaScript. Docs that need JS to render are docs an agent cannot read.
//
// Usage: node build.mjs          build into dist/
//        node build.mjs --check  exit 1 if the build output would differ (CI gate)

import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, existsSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { marked } from "marked";

const ROOT = dirname(new URL(import.meta.url).pathname);
const CONTENT = join(ROOT, "content");
const DIST = join(ROOT, "dist");
const SITE = "https://docs.onedroid.ai";
const REPO = "https://github.com/OneDro1d/onedroid-docs";
const CHECK = process.argv.includes("--check");

// ---------------------------------------------------------------- frontmatter

/** Parse the `---` block. Deliberately not a YAML parser: keys are flat strings here,
 *  and pulling in js-yaml to read four fields is how a build turns into a dependency tree. */
function parse(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { meta: {}, body: raw };
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_-]+):\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, "");
  }
  return { meta, body: raw.slice(m[0].length) };
}

// ---------------------------------------------------------------- discovery

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.endsWith(".md")) out.push(full);
  }
  return out;
}

const pages = walk(CONTENT)
  .map((file) => {
    const raw = readFileSync(file, "utf8");
    const { meta, body } = parse(raw);
    const rel = relative(CONTENT, file).replace(/\\/g, "/");
    const slug = rel.replace(/\.md$/, "").replace(/(^|\/)index$/, "");
    if (!meta.title) throw new Error(`${rel}: frontmatter needs a title`);
    if (!meta.description) throw new Error(`${rel}: frontmatter needs a description`);
    return {
      rel,
      slug,
      url: slug ? `/${slug}` : "/",
      meta,
      body,
      raw,
      order: Number(meta.order ?? 999),
      section: meta.section ?? "",
    };
  })
  .sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));

// ---------------------------------------------------------------- rendering

marked.setOptions({ mangle: false, headerIds: true, gfm: true });

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function nav(current) {
  const groups = new Map();
  for (const p of pages) {
    const key = p.section || "Documentation";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }
  let out = "";
  for (const [section, items] of groups) {
    out += `<p class="nav-section">${esc(section)}</p><ul>`;
    for (const p of items) {
      const here = p.url === current ? ' aria-current="page"' : "";
      out += `<li><a href="${p.url}"${here}>${esc(p.meta.nav || p.meta.title)}</a></li>`;
    }
    out += "</ul>";
  }
  return out;
}

const CSS = `
:root{--bg:#0f1012;--fg:#e8e6e3;--muted:#a5a29d;--line:#2a2c30;--accent:#e8e6e3;--code:#16181b}
@media(prefers-color-scheme:light){:root{--bg:#fbfaf9;--fg:#1a1a1a;--muted:#5c5a57;--line:#e3e0dc;--accent:#111;--code:#f3f1ee}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.65 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:underline;text-underline-offset:.2em;text-decoration-color:var(--muted)}
a:hover{text-decoration-color:var(--fg)}
.wrap{max-width:1120px;margin:0 auto;padding:0 24px;display:grid;grid-template-columns:240px minmax(0,1fr);gap:56px}
header{border-bottom:1px solid var(--line)}
header .wrap{display:flex;justify-content:space-between;align-items:center;padding-top:18px;padding-bottom:18px;gap:24px}
.brand{font-weight:600;letter-spacing:.02em;text-decoration:none}
.brand span{color:var(--muted);font-weight:400}
nav.side{padding:36px 0;font-size:14px;position:sticky;top:0;align-self:start;max-height:100vh;overflow-y:auto}
nav.side ul{list-style:none;margin:0 0 22px;padding:0}
nav.side li{margin:.35em 0}
nav.side a{text-decoration:none;color:var(--muted)}
nav.side a:hover{color:var(--fg)}
nav.side a[aria-current=page]{color:var(--fg);font-weight:600}
.nav-section{font-size:11px;text-transform:uppercase;letter-spacing:.09em;color:var(--muted);margin:0 0 .5em;opacity:.75}
main{padding:36px 0 96px;min-width:0}
main h1{font-size:34px;line-height:1.2;margin:0 0 .3em;letter-spacing:-.02em}
main h2{font-size:23px;margin:2em 0 .5em;letter-spacing:-.01em}
main h3{font-size:17px;margin:1.8em 0 .4em}
main .lede{color:var(--muted);font-size:18px;margin:0 0 2em}
code{background:var(--code);padding:.15em .4em;border-radius:4px;font-size:.88em;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
pre{background:var(--code);padding:16px 18px;border-radius:8px;overflow-x:auto;border:1px solid var(--line)}
pre code{background:none;padding:0;font-size:13.5px;line-height:1.6}
blockquote{margin:1.5em 0;padding:.1em 0 .1em 18px;border-left:3px solid var(--line);color:var(--muted)}
table{border-collapse:collapse;width:100%;margin:1.5em 0;font-size:14.5px;display:block;overflow-x:auto}
th,td{border:1px solid var(--line);padding:9px 12px;text-align:left;vertical-align:top}
th{background:var(--code);font-weight:600}
hr{border:0;border-top:1px solid var(--line);margin:2.5em 0}
footer{border-top:1px solid var(--line);color:var(--muted);font-size:14px}
footer .wrap{display:block;padding-top:24px;padding-bottom:48px}
footer p{margin:0 0 .7em;max-width:70ch}
header nav.top{display:flex;gap:20px;font-size:14px}
header nav.top a{text-decoration:none;color:var(--muted)}
header nav.top a:hover{color:var(--fg)}
.src{margin-top:3em;padding-top:1.2em;border-top:1px solid var(--line);font-size:13.5px;color:var(--muted)}
@media(max-width:820px){.wrap{grid-template-columns:1fr;gap:0}nav.side{position:static;max-height:none;padding:24px 0 0;border-bottom:1px solid var(--line)}main{padding-top:24px}}
`.trim();

function page(p) {
  const canonical = `${SITE}${p.url}`;
  const html = marked.parse(p.body);
  const mdHref = (p.slug ? `/${p.slug}` : "/index") + ".md";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(p.meta.title)} — OneDroid Docs</title>
<meta name="description" content="${esc(p.meta.description)}">
<link rel="canonical" href="${canonical}">
<link rel="alternate" type="text/markdown" href="${mdHref}">
<meta property="og:title" content="${esc(p.meta.title)} — OneDroid Docs">
<meta property="og:description" content="${esc(p.meta.description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:type" content="article">
<style>${CSS}</style>
</head>
<body>
<header><div class="wrap"><a class="brand" href="/">ONEDROID <span>Docs</span></a><nav class="top"><a href="${REPO}">Source on GitHub</a><a href="https://synapse.onedroid.ai">Open Synapse</a></nav></div></header>
<div class="wrap">
<nav class="side">${nav(p.url)}</nav>
<main>
<h1>${esc(p.meta.title)}</h1>
<p class="lede">${esc(p.meta.description)}</p>
${html}
<p class="src"><strong>Source of truth:</strong> this page is generated from <a href="${REPO}/blob/main/content/${p.rel}"><code>content/${p.rel}</code></a> in a public repo. The repo is authoritative — if this page and the markdown disagree, the markdown is right and the site is stale. <a href="${REPO}/edit/main/content/${p.rel}">Edit this page</a> · <a href="${mdHref}">read it as markdown</a> · <a href="${REPO}/issues">report a problem</a>.</p>
</main>
</div>
<footer><div class="wrap"><p>These docs are open source. Every page lives as markdown in <a href="${REPO}">OneDro1d/onedroid-docs</a> and this site is built from it — one copy, publicly auditable, and readable by any agent.</p><p>OneDroid (onedroid.ai) is AI agent infrastructure by Providentia Worldwide. Unrelated to Android or the OneDroid Android projects.</p></div></footer>
</body>
</html>
`;
}

// ---------------------------------------------------------------- emit

const files = new Map();

for (const p of pages) {
  files.set(p.slug ? `${p.slug}/index.html` : "index.html", page(p));
  // The markdown twin is the SOURCE, byte for byte — not a re-render of a render.
  files.set(p.slug ? `${p.slug}.md` : "index.md", p.raw);
}

files.set(
  "llms.txt",
  `# OneDroid Docs\n\n` +
    `> Documentation for OneDroid Synapse (a governed MCP gateway) and OneDroid Engram\n` +
    `> (versioned agent memory in your own Postgres).\n\n` +
    `Every page below is also available as markdown by appending .md to its path, and is\n` +
    `served as markdown to AI-agent user-agents at the canonical URL.\n\n` +
    `## Docs\n\n` +
    pages.map((p) => `- [${p.meta.title}](${SITE}${p.url}): ${p.meta.description}`).join("\n") +
    `\n`
);

files.set(
  "sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    pages.map((p) => `  <url><loc>${SITE}${p.url}</loc></url>`).join("\n") +
    `\n</urlset>\n`
);

files.set(
  "robots.txt",
  [
    "User-agent: *",
    "Allow: /",
    "",
    "# Explicitly welcome the agent crawlers. These docs exist to be read by machines.",
    ...["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-User", "PerplexityBot", "Google-Extended", "CCBot"].flatMap(
      (ua) => [`User-agent: ${ua}`, "Allow: /", ""]
    ),
    `Sitemap: ${SITE}/sitemap.xml`,
    "",
  ].join("\n")
);

if (CHECK) {
  let stale = [];
  for (const [rel, body] of files) {
    const path = join(DIST, rel);
    if (!existsSync(path) || readFileSync(path, "utf8") !== body) stale.push(rel);
  }
  if (stale.length) {
    console.error(`STALE (${stale.length}): ${stale.slice(0, 8).join(", ")}`);
    process.exit(1);
  }
  console.log(`OK: dist matches content (${pages.length} pages).`);
  process.exit(0);
}

rmSync(DIST, { recursive: true, force: true });
for (const [rel, body] of files) {
  const path = join(DIST, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body);
}
console.log(`Built ${pages.length} pages, ${files.size} files -> dist/`);
