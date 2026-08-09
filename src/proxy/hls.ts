import type { IncomingMessage, ServerResponse } from 'node:http';
import { pipeline } from 'node:stream/promises';
import { fetch as undiciFetch } from 'undici';
import { userAgent, siteReferer, cdnUrl } from '../config.js';
import { getProxyAgent } from './agents.js';
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
};

const MOON = 'moon.ironwallnet.net';
const EDU = 'studyedu.site';
const REQ_MS = 20000;



export function proxyPlaylistUrl(origin: string, url: string, server: string, pid?: number) {
  const p = new URLSearchParams({ url, server });
  if (pid !== undefined) p.set('pid', pid.toString());
  return `${origin}/api/hls?${p}`;
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

function rewrite(text: string, base: string, origin: string, server: string, pid?: number) {
  return text
    .split('\n')
    .map((line) => {
      const t = line.trim();
      if (!t) return line;
      if (t.startsWith('#')) {
        if (!t.includes('URI="')) return line;
        return t.replace(/URI="([^"]+)"/g, (_, uri: string) => `URI="${proxyPlaylistUrl(origin, abs(uri, base), server, pid)}"`);
      }
      return proxyPlaylistUrl(origin, abs(t, base), server, pid);
    })
    .join('\n');
}

async function upstream(url: string, headers: Record<string, string>, pid?: number) {
  const dispatcher = pid !== undefined ? getProxyAgent(pid) : undefined;
  const options = { method: 'GET', headers, redirect: 'follow', signal: AbortSignal.timeout(REQ_MS), dispatcher } as any;

  let res = await undiciFetch(onMoon(url), options);
  if (res.status === 200 || res.status === 206) return res;
  
  if (res.body) await res.body.cancel();

  if (!new URL(url).pathname.startsWith('/vd/')) {
    throw new Error(`upstream failed: ${res.status}`);
  }

  res = await undiciFetch(onEdu(url), options);
  if (res.status !== 200 && res.status !== 206) {
    if (res.body) await res.body.cancel();
    throw new Error(`upstream edu failed: ${res.status}`);
  }
  return res;
}

export async function serveProxyHls(
  req: IncomingMessage,
  res: ServerResponse,
  target: string,
  origin: string,
  server: string,
  opts: { segmentType?: string; pid?: number } = {},
) {
  const headers: Record<string, string> = {
    'user-agent': userAgent,
    referer: siteReferer,
    accept: '*/*',
    ...(req.headers.range ? { range: String(req.headers.range) } : {}),
  };

  const playlist = new URL(target).pathname.endsWith('.m3u8');
  const up = await upstream(target, headers, opts.pid);

  if (playlist) {
    res.writeHead(200, { ...cors, 'Content-Type': 'application/vnd.apple.mpegurl' });
    res.end(rewrite(await up.text(), target, origin, server, opts.pid));
    return;
  }

  const out: Record<string, string> = {
    ...cors,
    'content-type': opts.segmentType || up.headers.get('content-type') || 'application/octet-stream',
  };
  for (const name of ['content-length', 'content-range', 'accept-ranges']) {
    const val = up.headers.get(name);
    if (val) out[name] = val;
  }
  res.writeHead(up.status, out);
  
  try {
    if (up.body) await pipeline(up.body as any, res);
    else res.end();
  } catch {
    if (up.body) await up.body.cancel();
  }
}
