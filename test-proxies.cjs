const { fetch, ProxyAgent } = require('undici');

const proxies = `31.59.20.176:6754:zdkounao:ws3hlw0kbzgp
31.56.127.193:7684:zdkounao:ws3hlw0kbzgp
45.38.107.97:6014:zdkounao:ws3hlw0kbzgp
198.105.121.200:6462:zdkounao:ws3hlw0kbzgp
64.137.96.74:6641:zdkounao:ws3hlw0kbzgp
198.23.243.226:6361:zdkounao:ws3hlw0kbzgp
38.154.185.97:6370:zdkounao:ws3hlw0kbzgp
84.247.60.125:6095:zdkounao:ws3hlw0kbzgp
142.111.67.146:5611:zdkounao:ws3hlw0kbzgp
191.96.254.138:6185:zdkounao:ws3hlw0kbzgp`.split('\n');

async function testProxy(proxy) {
  const [ip, port, user, pass] = proxy.trim().split(':');
  const dispatcher = new ProxyAgent(`http://${user}:${pass}@${ip}:${port}`);
  
  try {
    const res = await fetch('https://vidcore.net/', { 
      dispatcher,
      signal: AbortSignal.timeout(5000), // 5 seconds timeout
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
      }
    });
    return `[${ip}] Status: ${res.status}`;
  } catch (e) {
    return `[${ip}] Failed: ${e.message}`;
  }
}

async function run() {
  const results = await Promise.all(proxies.map(testProxy));
  console.log(results.join('\n'));
}

run();
