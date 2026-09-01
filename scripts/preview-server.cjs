'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const port = Number(process.env.SIMPLE_GRADIENT_PREVIEW_PORT || 4177);
const host = '127.0.0.1';

const staticFiles = new Map([
  ['/media/studio.css', ['media/studio.css', 'text/css; charset=utf-8']],
  ['/media/studio.js', ['media/studio.js', 'text/javascript; charset=utf-8']],
  ['/node_modules/@vscode/codicons/dist/codicon.css', ['node_modules/@vscode/codicons/dist/codicon.css', 'text/css; charset=utf-8']],
  ['/node_modules/@vscode/codicons/dist/codicon.ttf', ['node_modules/@vscode/codicons/dist/codicon.ttf', 'font/ttf']]
]);

function renderHtml(view) {
  return fs.readFileSync(path.join(root, 'media', 'studio.html'), 'utf8')
    .replaceAll('{{view}}', view)
    .replaceAll('{{cspSource}}', "'self'")
    .replaceAll('{{nonce}}', 'preview-nonce')
    .replaceAll('{{cssUri}}', '/media/studio.css')
    .replaceAll('{{scriptUri}}', '/media/studio.js')
    .replaceAll('{{codiconUri}}', '/node_modules/@vscode/codicons/dist/codicon.css');
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url || '/', `http://${host}:${port}`);
  if (url.pathname === '/' || url.pathname === '/index.html') {
    const requested = url.searchParams.get('view');
    const view = requested === 'assignments' || requested === 'preview' ? requested : 'studio';
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(renderHtml(view));
    return;
  }

  const entry = staticFiles.get(url.pathname);
  if (!entry) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }
  const [relative, contentType] = entry;
  const resolved = path.resolve(root, relative);
  if (!resolved.startsWith(root + path.sep)) {
    response.writeHead(403);
    response.end();
    return;
  }
  response.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-store' });
  fs.createReadStream(resolved).pipe(response);
});

server.listen(port, host, () => {
  process.stdout.write(`SimpleGradient Studio preview: http://${host}:${port}\n`);
});
