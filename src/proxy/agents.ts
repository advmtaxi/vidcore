import { ProxyAgent, fetch as undiciFetch } from 'undici';
import { proxyUrls, userAgent } from '../config.js';

let agents: ProxyAgent[] = [];

export async function initializeProxies() {
  console.log(`Testing ${proxyUrls.length} configured proxies...`);
  const testPromises = proxyUrls.map(async (url) => {
    let formattedUrl = url;
    const parts = url.split(':');
    if (parts.length === 4 && !url.includes('://')) {
      const [ip, port, user, pass] = parts;
      formattedUrl = `http://${user}:${pass}@${ip}:${port}`;
    } else if (!url.includes('://')) {
      formattedUrl = `http://${url}`;
    }
    
    const agent = new ProxyAgent(formattedUrl);
    
    try {
      const res = await undiciFetch('https://vidcore.net/', {
        dispatcher: agent,
        signal: AbortSignal.timeout(5000),
        headers: { 'user-agent': userAgent, 'accept': '*/*' }
      } as any);
      
      if (res.status === 200 || res.status === 404) {
        // We just need to know it connects and bypasses cloudflare (404 is fine too for the base domain)
        if (res.body) await (res.body as any).cancel().catch(() => {});
        return agent;
      }
      if (res.body) await (res.body as any).cancel().catch(() => {});
      return null;
    } catch (e) {
      return null;
    }
  });

  const results = await Promise.all(testPromises);
  agents = results.filter((a): a is ProxyAgent => a !== null);
  return agents.length;
}

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
