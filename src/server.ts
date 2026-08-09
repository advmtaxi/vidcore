import { createServer } from 'node:http';
import { ProxyAgent, setGlobalDispatcher } from 'undici';
import { port, host, proxyUrl } from './config.js';
import { handleRequest } from './http/router.js';

if (proxyUrl) {
  setGlobalDispatcher(new ProxyAgent(proxyUrl));
  console.log(`proxy → ${proxyUrl.replace(/:\/\/.*@/, '://***@')}`);
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

