"""Update EPICSTAR_TELEGRAM_AUTOPOST in the compose-stack n8n via PATCH.

Credentials are read from env (N8N_EMAIL / N8N_PASSWORD) or from the
gitignored .env file in the repo root — never hardcoded.
"""
import json
import os
import re
import subprocess
import sys
import urllib.request

HOST = os.environ.get('N8N_HOST', 'http://192.168.7.4:5680')
WF_ID = 'udFVdV1KhFUhZfGU'


def load_credentials():
    email = os.environ.get('N8N_EMAIL')
    password = os.environ.get('N8N_PASSWORD')
    if email and password:
        return email, password
    # fallback: read from gitignored .env in repo root
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
    if os.path.exists(env_path):
        with open(env_path, encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line.startswith('#') or '=' not in line:
                    continue
                k, _, v = line.partition('=')
                if k == 'N8N_EMAIL' and not email:
                    email = v.strip()
                elif k == 'N8N_PASSWORD' and not password:
                    password = v.strip()
    if not email or not password:
        sys.exit('N8N_EMAIL/N8N_PASSWORD не заданы (env или .env в корне репозитория)')
    return email, password


EMAIL, PASSWORD = load_credentials()

# login -> n8n-auth token (cookie is Secure, so pass manually)
out = subprocess.run(
    ['curl', '-s', '-D', '-', '-o', '/dev/null', '-X', 'POST', '-H', 'Content-Type: application/json',
     '-d', json.dumps({'emailOrLdapLoginId': EMAIL, 'password': PASSWORD}),
     HOST + '/rest/login'],
    capture_output=True, text=True).stdout
m = re.search(r'n8n-auth=([^;]+);', out)
if not m:
    sys.exit('login failed: ' + out[:300])
COOKIE = 'n8n-auth=' + m.group(1)


def api(path, method='GET', body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(HOST + path, data=data, method=method,
                                 headers={'Cookie': COOKIE, 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())


# 1. get current workflow (versionId)
st, cur = api('/rest/workflows/' + WF_ID)
if st != 200:
    print('GET failed:', st, cur); raise SystemExit(1)
cur = cur['data']
version_id = cur['versionId']
print('current versionId:', version_id[:12], '| active:', cur.get('active'))

# 2. load repo workflow
repo = json.load(open('n8n-workflows/EPICSTAR_TELEGRAM_AUTOPOST.json', encoding='utf-8'))

# 3. PATCH update: keep server-side fields, replace nodes/connections/settings from repo
payload = {
    'name': cur['name'],
    'nodes': repo['nodes'],
    'connections': repo['connections'],
    'settings': repo.get('settings', {}),
    'versionId': version_id,
}
st, upd = api('/rest/workflows/' + WF_ID, 'PATCH', payload)
if st != 200:
    print('PATCH failed:', st, upd); raise SystemExit(1)
d = upd.get('data', upd)
print('updated:', d.get('name'), '| active:', d.get('active'), '| new versionId:', str(d.get('versionId'))[:12])
print('nodes now:', [n['name'] for n in d.get('nodes', [])])
