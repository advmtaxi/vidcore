import urllib.request
import urllib.error
import json

key = 'b2c63b1d-c3b8-4930-b0db-84c3b03db6362c505ffc-0854-47ff-9814-c1bc5150dea5'
zoneId = 6300700
url = f'https://api.bunny.net/pullzone/{zoneId}/edgerules/addOrUpdate'

rule1 = {
  "ActionType": 2,
  "ActionParameter1": "https://%{URL_1}/%{URL_2}",
  "Description": "Proxy HLS Segments",
  "Enabled": True,
  "Triggers": [{
      "Type": 0,
      "PatternMatches": ["^https://vidcorea.b-cdn.net/proxy/([^/]+)/(.*)"],
      "PatternMatchingType": 2
  }]
}

rule2 = {
  "ActionType": 6,
  "ActionParameter1": "Referer",
  "ActionParameter2": "https://vidcore.net/",
  "Description": "Set Referer Header for Upstream",
  "Enabled": True,
  "Triggers": [{
      "Type": 0,
      "PatternMatches": ["^https://vidcorea.b-cdn.net/proxy/([^/]+)/(.*)"],
      "PatternMatchingType": 2
  }]
}

def send_rule(rule):
    req = urllib.request.Request(url, data=json.dumps(rule).encode('utf-8'))
    req.add_header('AccessKey', key)
    req.add_header('Content-Type', 'application/json')
    try:
        res = urllib.request.urlopen(req)
        print("Success:", res.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print("Error:", e.code, e.read().decode('utf-8'))
    except Exception as e:
        print("Exception:", e)

send_rule(rule1)
send_rule(rule2)
