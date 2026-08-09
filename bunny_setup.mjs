const key = 'b2c63b1d-c3b8-4930-b0db-84c3b03db6362c505ffc-0854-47ff-9814-c1bc5150dea5';
const zoneId = 6300700;

const rule1 = {
  ActionType: 2, // OriginUrl
  ActionParameter1: "https://%{URL_1}/%{URL_2}",
  Description: "Proxy HLS Segments",
  Enabled: true,
  Triggers: [
    {
      Type: 0, // Request URL
      PatternMatches: ["^https://vidcorea.b-cdn.net/proxy/([^/]+)/(.*)"],
      PatternMatchingType: 2 // Match Regex
    }
  ]
};

const rule2 = {
  ActionType: 6, // SetRequestHeader
  ActionParameter1: "Referer",
  ActionParameter2: "https://vidcore.net/",
  Description: "Set Referer Header for Upstream",
  Enabled: true,
  Triggers: [
    {
      Type: 0, // Request URL
      PatternMatches: ["^https://vidcorea.b-cdn.net/proxy/([^/]+)/(.*)"],
      PatternMatchingType: 2 // Match Regex
    }
  ]
};

async function addRule(rule) {
  const res = await fetch(`https://api.bunny.net/pullzone/${zoneId}/edgerules/addOrUpdate`, {
    method: 'POST',
    headers: {
      'AccessKey': key,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(rule)
  });
  const text = await res.text();
  console.log('Result:', res.status, text);
}

async function main() {
  console.log("Adding Rule 1: Change Origin URL");
  await addRule(rule1);
  console.log("Adding Rule 2: Set Referer");
  await addRule(rule2);
}

main().catch(console.error);
