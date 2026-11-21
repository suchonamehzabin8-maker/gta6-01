// Palmera Bay — Sunset Run: a tiny static server for local play. Serves
// game/ at the root on port 8080, answers GET /health with {"ok":true}, and
// logs every request to stdout. Node 22, standard library only.
//
//   node serve.ts [--port 8080] [--host 127.0.0.1]

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const root = join(here, 'game');

const args = process.argv.slice(2);
let port = 8080;
let host = '127.0.0.1';
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--port' && args[i + 1]) port = Number(args[++i]);
  if (args[i] === '--host' && args[i + 1]) host = args[++i];
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

const server = createServer(async (req, res) => {
  const stamp = new Date().toISOString();
  console.log(`${stamp} ${req.method} ${req.url}`);
  try {
    if (req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{"ok":true}');
      return;
    }
    const path = req.url === '/' ? '/index.html' : decodeURIComponent(req.url.split('?')[0]);
    // No climbing out of game/: the resolved path must stay under root.
    const file = normalize(join(root, path));
    if (!file.startsWith(root + sep) && file !== root) {
      res.writeHead(403);
      res.end('forbidden');
      return;
    }
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});

server.listen(port, host, () => {
  console.log(`Palmera Bay serving game/ at http://${host}:${port}/`);
});
