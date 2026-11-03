#!/usr/bin/env python3
"""Install the built newsroom as a localhost-only systemd user service in Linux/WSL."""
import argparse
from pathlib import Path
import secrets
import shutil
import subprocess


def quote(value):
    return '"' + str(value).replace('\\', '\\\\').replace('"', '\\"').replace('%', '%%') + '"'


def install(repo, port):
    repo = repo.resolve()
    if any(c in str(repo) + str(Path.home()) for c in '\r\n'):
        raise ValueError('Paths cannot contain line breaks')
    node = shutil.which('node')
    if not node or not (repo / 'artifacts/api-server/dist/index.mjs').is_file() or not (repo / 'artifacts/natasha-fri/dist/public/index.html').is_file():
        raise ValueError('Run pnpm install --frozen-lockfile && pnpm run build first')
    state = Path.home() / '.local/state/newnews-rus'
    state.mkdir(parents=True, exist_ok=True, mode=0o700)
    key = state / 'studio-token'
    if not key.exists():
        with key.open('x') as file:
            file.write(secrets.token_urlsafe(32))
    key.chmod(0o600)
    env = state / 'service.env'
    env.write_text('\n'.join([
        'NODE_ENV=production', 'HOST=127.0.0.1', f'PORT={port}', 'ENABLE_LEMLIST=false',
        f'NEWNEWS_STUDIO_TOKEN={key.read_text().strip()}',
        f'NEWNEWS_DATA_DIR={quote(state / "packages")}',
        f'NEWNEWS_WEB_DIR={quote(repo / "artifacts/natasha-fri/dist/public")}', '',
    ]))
    env.chmod(0o600)
    units = Path.home() / '.config/systemd/user'
    units.mkdir(parents=True, exist_ok=True)
    (units / 'newnews-rus-studio.service').write_text(f'''[Unit]
Description=NEW NEWS RUS local editorial studio
After=network.target

[Service]
Type=simple
WorkingDirectory={str(repo).replace('%', '%%')}
Environment=HOST=127.0.0.1 PORT={port} ENABLE_LEMLIST=false
EnvironmentFile={str(env).replace('%', '%%')}
ExecStartPre=/usr/bin/test -r {quote(env)}
ExecStart={quote(node)} --enable-source-maps {quote(repo / 'artifacts/api-server/dist/index.mjs')}
Restart=on-failure
RestartSec=5
UMask=0077
NoNewPrivileges=true

[Install]
WantedBy=default.target
''')
    subprocess.run(['systemd-analyze', '--user', 'verify', str(units / 'newnews-rus-studio.service')], check=True)
    subprocess.run(['systemctl', '--user', 'daemon-reload'], check=True)
    subprocess.run(['systemctl', '--user', 'enable', 'newnews-rus-studio.service'], check=True)
    subprocess.run(['systemctl', '--user', 'restart', 'newnews-rus-studio.service'], check=True)
    print(f'Local studio: http://127.0.0.1:{port}/')
    print(f'Studio key remains on this device: {key}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--port', type=int, default=17888)
    args = parser.parse_args()
    if not 1024 <= args.port <= 65535:
        parser.error('Use an unprivileged port between 1024 and 65535')
    install(args.repo, args.port)
