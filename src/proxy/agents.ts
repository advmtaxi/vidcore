import { ProxyAgent } from 'undici';
import { proxyUrls } from '../config.js';

// Pre-initialize ProxyAgent instances for performance
const agents = proxyUrls.map((url) => {
  // undici ProxyAgent expects standard proxy URLs (e.g., http://user:pass@host:port)
  const formattedUrl = url.includes('://') ? url : `http://${url}`;
  return new ProxyAgent(formattedUrl);
});

/**
 * Returns a random proxy ID
 */
export function getRandomProxyId(): number {
  if (agents.length === 0) return -1;
  return Math.floor(Math.random() * agents.length);
}

/**
 * Returns the ProxyAgent for the given ID, or undefined if no proxy is configured
 */
export function getProxyAgent(id: number): ProxyAgent | undefined {
  if (agents.length === 0 || id < 0) return undefined;
  return agents[id % agents.length]; // fallback gracefully if ID is out of bounds
}

export function hasProxies(): boolean {
  return agents.length > 0;
}
