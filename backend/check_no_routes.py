#!/usr/bin/env python3
"""Refuse a Worker config that would attach a route.

    python3 backend/check_no_routes.py backend/wrangler.jsonc

Until the owner approves routing akshayprabhakant.com/work/election-atlas to
this Worker, it may answer only on its workers.dev preview URL: the config must
carry no `route`/`routes` (top level or in any environment) and no custom domain.
"""
import json
import re
import sys


def strip_jsonc(text):
    """Drop // and /* */ comments outside strings, and trailing commas."""
    out, i, n = [], 0, len(text)
    while i < n:
        c = text[i]
        if c == '"':
            j = i + 1
            while j < n and text[j] != '"':
                j += 2 if text[j] == '\\' else 1
            out.append(text[i:j + 1])
            i = j + 1
        elif text.startswith('//', i):
            i = text.find('\n', i) if '\n' in text[i:] else n
        elif text.startswith('/*', i):
            i = text.index('*/', i) + 2
        else:
            out.append(c)
            i += 1
    return re.sub(r',(\s*[}\]])', r'\1', ''.join(out))


def routes_in(config, where='top level'):
    found = [f'{where}: "{k}"' for k in ('route', 'routes') if config.get(k)]
    for name, env in (config.get('env') or {}).items():
        found += routes_in(env, f'env.{name}')
    return found


def main(argv):
    config = json.loads(strip_jsonc(open(argv[1], encoding='utf-8').read()))
    found = routes_in(config)
    if found:
        print('refusing: the Worker config attaches routes (' + ', '.join(found) + ').')
        print('Routing akshayprabhakant.com to this Worker is a separate step the owner approves.')
        return 1
    print(f'{argv[1]}: no routes; the Worker answers only on workers.dev '
          f'(workers_dev = {config.get("workers_dev")})')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
