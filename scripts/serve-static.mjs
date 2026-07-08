import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const root = process.cwd();
const outDir = join(root, "out");
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".svg", "image/svg+xml"],
  [".ico", "image/x-icon"],
  [".apk", "application/vnd.android.package-archive"],
]);

function resolvePath(url = "/") {
  const parsed = new URL(url, "http://localhost");
  const decodedPath = decodeURIComponent(parsed.pathname);
  const normalizedPath = normalize(decodedPath).replace(/^(\.\.[/\\])+/, "");
  const candidates = [];

  if (normalizedPath.endsWith("/")) {
    candidates.push(join(outDir, normalizedPath, "index.html"));
  } else {
    candidates.push(join(outDir, normalizedPath));
    candidates.push(join(outDir, normalizedPath, "index.html"));
    candidates.push(join(outDir, `${normalizedPath}.html`));
  }

  return candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
}

const server = createServer((request, response) => {
  const filePath = resolvePath(request.url);

  if (!filePath) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": contentTypes.get(extname(filePath)) ?? "application/octet-stream",
    "X-Content-Type-Options": "nosniff",
  });
  createReadStream(filePath).pipe(response);
});

server.listen(port, host, () => {
  console.log(`[serve-static] serving ${outDir} at http://${host}:${port}`);
});