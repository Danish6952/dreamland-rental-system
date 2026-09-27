// LOCAL STACK ONLY: one URL like Supabase (/auth/v1 -> GoTrue, /rest/v1 -> PostgREST)
import http from 'node:http';
const routes = [
  ['/auth/v1', 'http://127.0.0.1:59999'],
  ['/rest/v1', 'http://127.0.0.1:53000'],
];
http
  .createServer((req, res) => {
    const cors = {
      'access-control-allow-origin': req.headers.origin ?? '*',
      'access-control-allow-headers': req.headers['access-control-request-headers'] ?? '*',
      'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
      'access-control-expose-headers': 'content-range, x-supabase-api-version',
    };
    if (req.method === 'OPTIONS') return res.writeHead(204, cors).end();
    const hit = routes.find(([p]) => req.url.startsWith(p));
    if (!hit) return res.writeHead(404, cors).end('not found');
    const target = new URL(req.url.slice(hit[0].length) || '/', hit[1]);
    const up = http.request(target, { method: req.method, headers: { ...req.headers, host: target.host } }, (r) => {
      res.writeHead(r.statusCode ?? 502, { ...r.headers, ...cors });
      r.pipe(res);
    });
    up.on('error', (e) => res.writeHead(502, cors).end(String(e)));
    req.pipe(up);
  })
  .listen(54321, () => console.log('proxy on http://localhost:54321'));
