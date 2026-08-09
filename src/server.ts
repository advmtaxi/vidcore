import { createServer } from 'node:http';
import { port, host } from './config.js';
import { handleRequest } from './http/router.js';
import { hasProxies } from './proxy/agents.js';

if (hasProxies()) {
  console.log(`Loaded multiple proxy agents for rotation`);
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

