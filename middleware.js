// Serve the markdown source to agents, the HTML to humans, at the same URL.
//
// This has to be middleware rather than a vercel.json rewrite: Vercel evaluates rewrites
// only AFTER the filesystem check, so a rewrite on a path that already resolves to a file
// never fires. That was verified the hard way on onedroid.ai — a ClaudeBot user-agent got
// byte-identical HTML to a browser until this moved into middleware.
//
// No imports. @vercel/edge's rewrite() helper would add a dependency to a build whose whole
// point is to have almost none.

const AGENTS = /(ClaudeBot|Claude-User|Claude-SearchBot|GPTBot|ChatGPT-User|OAI-SearchBot|PerplexityBot|Perplexity-User|Google-Extended|CCBot|Applebot-Extended|Bytespider|meta-externalagent)/i;

export const config = {
  matcher: ["/((?!_next|favicon|.*\\.(?:css|js|svg|png|jpg|webp|ico|txt|xml|json|md)$).*)"],
};

export default function middleware(request) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  const ua = request.headers.get("user-agent") || "";
  const accept = request.headers.get("accept") || "";
  if (!AGENTS.test(ua) && !accept.includes("text/markdown")) return;

  const twin = path === "/" ? "/index.md" : `${path}.md`;
  return new Response(null, {
    headers: {
      "x-middleware-rewrite": new URL(twin, request.url).toString(),
      Vary: "User-Agent, Accept",
    },
  });
}
