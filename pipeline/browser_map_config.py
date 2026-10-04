#!/usr/bin/env python3
"""Publish ONLY the intentionally public Kakao JavaScript app key.

Never serialize the environment or exception details. Same-format Kakao keys
cannot be distinguished by syntax: correct secret naming and console review
are required, in addition to rejecting known server credentials here.
"""
import json
import os
from pathlib import Path
import re


def build_config(environment):
    key = (environment.get('KAKAO_JAVASCRIPT_KEY') or '').strip()
    forbidden = [value.strip() for name, value in environment.items()
                 if (name.startswith('KAKAO_') and name != 'KAKAO_JAVASCRIPT_KEY') or name == 'SEOUL']
    if key and (not re.fullmatch(r'[0-9a-fA-F]{32}', key) or key in forbidden):
        raise ValueError('Browser map key rejected; review credential type without logging its value')
    return {'schema_version': 1, 'preferred_basemap': 'kakao',
            'browser_app_key': key or None,
            'allowed_origins': ['https://jaehojung1879-netizen.github.io']}


def main():
    config = build_config(os.environ)
    output = Path('docs/data/map-runtime.json')
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_suffix('.json.tmp')
    temporary.write_text(json.dumps(config, separators=(',', ':')) + '\n', encoding='utf-8')
    temporary.replace(output)
    print('Browser map config prepared: ' + ('Kakao enabled' if config['browser_app_key'] else 'safe fallback'))


if __name__ == '__main__':
    main()
