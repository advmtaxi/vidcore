import { createServer } from 'node:http';
import { port, host, proxyUrls } from './config.js';
import { handleRequest } from './http/router.js';
import { initializeProxies, hasProxies } from './proxy/agents.js';

const workingCount = await initializeProxies();
if (workingCount > 0) {
  console.log(`Loaded ${workingCount}/${proxyUrls.length} working proxy agents for rotation`);
} else if (proxyUrls.length > 0) {
  console.error(`WARNING: 0/${proxyUrls.length} proxies are working! All of them failed the boot test.`);
}

const srv = createServer((req, res) => {
  void handleRequest(req, res);
});

function boot() {
  const addr = srv.address();
  const h = typeof addr === 'string' ? addr : `${addr?.address}:${addr?.port}`;
  console.log(`http://${h}/`);
}

function shutdown(signal: string) {
  console.log(`${signal} received, shutting down…`);
  srv.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

srv.listen(port, host, boot);

