const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Load environment variables from .env
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let value = (match[2] || '').trim();
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[match[1]] = value;
      }
    }
  }
}
loadEnv();

const PORT = process.env.PORT || 3000;
const SERPAPI_KEY = process.env.SERPAPI_KEY || '';

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

const server = http.createServer(async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  // API Endpoint: /api/hotels (Fetches securely from SerpApi backend without CORS)
  if (pathname === '/api/hotels') {
    const apiKey = SERPAPI_KEY;
    if (!apiKey) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'SERPAPI_KEY not found in .env' }));
      return;
    }

    const query = parsedUrl.searchParams.get('q') || 'SaffronStays Foresta By The Lake - Villa in Kamshet';
    const checkIn = parsedUrl.searchParams.get('check_in_date') || '';
    const checkOut = parsedUrl.searchParams.get('check_out_date') || '';
    const currency = parsedUrl.searchParams.get('currency') || 'INR';

    let targetUrl = `https://serpapi.com/search.json?engine=google_hotels&q=${encodeURIComponent(query)}&currency=${currency}&hl=en&gl=in&api_key=${apiKey}`;
    if (checkIn && checkOut) {
      targetUrl += `&check_in_date=${checkIn}&check_out_date=${checkOut}`;
    }

    https.get(targetUrl, (apiRes) => {
      let data = '';
      apiRes.on('data', chunk => { data += chunk; });
      apiRes.on('end', () => {
        res.writeHead(apiRes.statusCode || 200, { 'Content-Type': 'application/json' });
        res.end(data);
      });
    }).on('error', (err) => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    });
    return;
  }

  // Static File Serving
  let filePath = path.join(__dirname, pathname === '/' ? 'Adopremium Service Apartment _ Short and Long Stays _ Fully Furnished.html' : pathname);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 Server running at: http://localhost:${PORT}`);
  console.log(`📡 SerpApi Endpoint: http://localhost:${PORT}/api/hotels`);
  console.log(`🔑 SERPAPI_KEY loaded: ${SERPAPI_KEY ? 'Yes (' + SERPAPI_KEY.slice(0, 8) + '...)' : 'No'}\n`);
});
