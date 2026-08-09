import type { IncomingMessage, ServerResponse } from 'node:http';
import { pipeline } from 'node:stream/promises';
import { request } from 'undici';
import { userAgent, siteReferer, cdnUrl } from '../config.js';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
};

const MOON = 'moon.ironwallnet.net';
const EDU = 'studyedu.site';
const REQ_MS = 20000;



export function proxyPlaylistUrl(origin: string, url: string, server: string) {
  return `${origin}/api/hls?${new URLSearchParams({ url, server })}`;
}

function onMoon(url: string) {
  const u = new URL(url);
  if (u.pathname.startsWith('/vd/') && u.hostname !== MOON) {
    u.protocol = 'https:';
    u.host = MOON;
  }
  return u.href;
}

function onEdu(url: string) {
  const u = new URL(url);
  if (u.pathname.startsWith('/vd/')) {
    u.protocol = 'https:';
    u.host = EDU;
  }
  return u.href;
}

function abs(uri: string, base: string) {
  return onMoon(new URL(uri, base).href);
}

function rewrite(text: string, base: string, origin: string, server: string) {
  return text
    .split('\n')
    .map((line) => {
      const t = line.trim();
      if (!t) return line;
      if (t.startsWith('#')) {
        if (!t.includes('URI="')) return line;
        return t.replace(/URI="([^"]+)"/g, (_, uri: string) => `URI="${proxyPlaylistUrl(origin, abs(uri, base), server)}"`);
      }
      return proxyPlaylistUrl(origin, abs(t, base), server);
    })
    .join('\n');
}

async function upstream(url: string, headers: Record<string, string>) {
  let res = await request(onMoon(url), { method: 'GET', headers, maxRedirections: 5, headersTimeout: REQ_MS });
  if (res.statusCode === 200 || res.statusCode === 206) return res;
  
  if (res.body) await res.body.dump();

  if (!new URL(url).pathname.startsWith('/vd/')) {
    throw new Error(`upstream failed: ${res.statusCode}`);
  }

  res = await request(onEdu(url), { method: 'GET', headers, maxRedirections: 5, headersTimeout: REQ_MS });
  if (res.statusCode !== 200 && res.statusCode !== 206) {
    if (res.body) await res.body.dump();
    throw new Error(`upstream edu failed: ${res.statusCode}`);
  }
  return res;
}

export async function serveProxyHls(
  req: IncomingMessage,
  res: ServerResponse,
  target: string,
  origin: string,
  server: string,
  opts: { segmentType?: string } = {},
) {
  const headers: Record<string, string> = {
    'user-agent': userAgent,
    referer: siteReferer,
    accept: '*/*',
    ...(req.headers.range ? { range: String(req.headers.range) } : {}),
  };

  const playlist = new URL(target).pathname.endsWith('.m3u8');
  const up = await upstream(target, headers);

  if (playlist) {
    res.writeHead(200, { ...cors, 'Content-Type': 'application/vnd.apple.mpegurl' });
    res.end(rewrite(await up.body.text(), target, origin, server));
    return;
  }

  const out: Record<string, string> = {
    ...cors,
    'content-type': opts.segmentType || (up.headers['content-type'] as string) || 'application/octet-stream',
  };
  for (const name of ['content-length', 'content-range', 'accept-ranges'] as const) {
    if (up.headers[name]) out[name] = String(up.headers[name]);
  }
  res.writeHead(up.statusCode, out);
  
  try {
    await pipeline(up.body, res);
  } catch {
    up.body.destroy();
  }
}
