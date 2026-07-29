/**
 * Tiny static server for the demo page.
 *
 * Exists for one reason: `python3 -m http.server` sends no cache headers, so
 * Chrome applies heuristic caching to the ES modules and keeps serving stale
 * JavaScript after an edit — the page then behaves like older code, or stops
 * responding entirely, with nothing in the console to explain it. This server
 * sends `Cache-Control: no-store` so a plain reload is always the real thing.
 *
 *   node tools/serve.mjs [port]
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, normalize, extname } from "node:path";

const PORT = Number(process.argv[2] ?? 4173);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "extension");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  const relative = normalize(path).replace(/^(\.\.[/\\])+/, "");
  const file = join(ROOT, relative === "/" ? "newtab.html" : relative);

  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end("Forbidden");
    return;
  }

  try {
    const body = await readFile(file);
    res.writeHead(200, {
      "Content-Type": MIME[extname(file)] ?? "application/octet-stream",
      "Cache-Control": "no-store, must-revalidate",
    });
    res.end(body);
  } catch {
    res.writeHead(404, { "Cache-Control": "no-store" }).end("Not found");
  }
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use — a server is running there already.\n` +
        `Open http://localhost:${PORT}/newtab.html?demo=1 , or stop the old one with:\n` +
        `  kill $(lsof -ti:${PORT})`
    );
    process.exit(1);
  }
  throw error;
});

server.listen(PORT, () => {
  console.log(`Demo:  http://localhost:${PORT}/newtab.html?demo=1   (simulated navigation)`);
  console.log(`Real:  http://localhost:${PORT}/newtab.html          (actually navigates)`);
  console.log("No-cache headers are set, so a plain reload always gets fresh code.");
});
