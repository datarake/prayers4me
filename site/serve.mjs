// A tiny static server for previewing ./dist (clean URLs, like the real host).
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), "dist");
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".ttf": "font/ttf", ".txt": "text/plain", ".js": "text/javascript; charset=utf-8", ".json": "application/json" };
const port = Number(process.env.PORT ?? 4173);

createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.includes("..")) { res.writeHead(400).end(); return; }
  let file = path.join(dist, p);
  try { if ((await stat(file)).isDirectory()) file = path.join(file, "index.html"); } catch { /* handled below */ }
  try {
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": types[path.extname(file)] ?? "application/octet-stream" }).end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" }).end(await readFile(path.join(dist, "404.html")));
  }
}).listen(port, () => console.log(`Preview on http://localhost:${port}`));
