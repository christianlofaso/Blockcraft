/* Dev-only static server that also accepts POST /shot to dump a screenshot to
   disk, so the game can be inspected visually while it runs. */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = 8932;
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json',
                '.png': 'image/png', '.jpg': 'image/jpeg', '.css': 'text/css' };

http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/shot') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const b64 = body.replace(/^data:image\/\w+;base64,/, '');
      fs.writeFileSync(path.join(ROOT, 'shot.png'), Buffer.from(b64, 'base64'));
      res.writeHead(200, { 'Access-Control-Allow-Origin': '*' });
      res.end('ok');
      console.log('shot.png written (' + (b64.length / 1024).toFixed(1) + ' KB b64)');
    });
    return;
  }
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/minecraft.html';
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end('not found'); return;
  }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log('dev server on http://localhost:' + PORT));
