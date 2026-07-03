import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT) || 8080;

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".json": "application/json",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function resolveSafeFilePath(urlPath) {
  let decoded = urlPath;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    decoded = urlPath;
  }
  const relative = decoded.replace(/^\/+/, "").replace(/\\/g, "/");
  const segments = relative.split("/").filter((seg) => seg && seg !== "..");
  const filePath = path.resolve(root, ...segments);
  const rootResolved = path.resolve(root);
  if (filePath !== rootResolved && !filePath.startsWith(rootResolved + path.sep)) {
    return null;
  }
  return filePath;
}

const server = http.createServer((req, res) => {
  let urlPath = (req.url || "/").split("?")[0];
  if (urlPath === "/") urlPath = "/index.html";
  const filePath = resolveSafeFilePath(urlPath);
  if (!filePath) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": types[path.extname(filePath).toLowerCase()] || "application/octet-stream" });
    res.end(data);
  });
});

server.listen(port, () => {
  console.log(`Game client: http://localhost:${port}/`);
});
