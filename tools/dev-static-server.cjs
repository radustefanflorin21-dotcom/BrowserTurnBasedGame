/**
 * Local static file server for the game client (port 8080).
 * Usage: node tools/dev-static-server.cjs
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || "127.0.0.1";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json"
};

function resolveSafeFile(reqUrl) {
  const pathname = decodeURIComponent(url.parse(reqUrl).pathname || "/");
  const segments = pathname.split("/").filter(Boolean);
  if (!segments.length) segments.push("index.html");
  const filePath = path.resolve(ROOT, ...segments);
  const relative = path.relative(ROOT, filePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return filePath;
}

function sendFile(res, filePath) {
  fs.stat(filePath, (err, st) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const finalPath = st.isDirectory() ? path.join(filePath, "index.html") : filePath;
    fs.readFile(finalPath, (readErr, data) => {
      if (readErr) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const ext = path.extname(finalPath).toLowerCase();
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
      res.end(data);
    });
  });
}

http
  .createServer((req, res) => {
    const filePath = resolveSafeFile(req.url);
    if (!filePath) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    sendFile(res, filePath);
  })
  .listen(PORT, HOST, () => {
    console.log(`Game files: http://${HOST}:${PORT}/?mmo=online`);
    console.log(`Serving: ${ROOT}`);
  });
