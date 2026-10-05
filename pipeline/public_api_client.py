"""Credential-safe official API transport; credentials never leave process memory."""
import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

HOSTS = {'apis.data.go.kr', 'www.reb.or.kr'}
SECRET_NAMES = ('DATA_GO', 'R_ONE')


class SourceError(Exception):
    """Only public operation/status codes may appear in the message."""


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise SourceError('REDIRECT_REJECTED')


def require_secrets(env=None):
    env = os.environ if env is None else env
    missing = [name for name in SECRET_NAMES if not env.get(name, '').strip()]
    if missing:
        raise SourceError('MISSING_REQUIRED_SECRET_' + '_'.join(missing))
    return {name: env[name].strip() for name in SECRET_NAMES}


def data_go_key(provided):
    # unquote, NOT unquote_plus: a raw base64 '+' is credential data, never a space.
    # Decode at most once, then urlencode once. Both raw and portal-encoded keys work.
    return urllib.parse.unquote(provided) if re.search(r'%[0-9a-fA-F]{2}', provided) else provided


def assert_sanitized(value, secrets=()):
    encoded = json.dumps(value, ensure_ascii=False) if not isinstance(value, str) else value
    for secret in secrets:
        if not secret:
            continue
        decoded = data_go_key(secret)
        forms = {secret, decoded, urllib.parse.quote(secret, safe=''), urllib.parse.quote(decoded, safe='')}
        if any(form and form in encoded for form in forms):
            raise SourceError('CREDENTIAL_LEAK_REJECTED')
    if re.search(r'(?i)(?:[?&]|&amp;)(?:serviceKey|KEY|apiKey|authKey)\s*=', encoded):
        raise SourceError('CREDENTIAL_QUERY_REJECTED')
    return value


class Client:
    def __init__(self, secrets=None, opener=None, budget=120):
        self.secrets = require_secrets() if secrets is None else require_secrets(secrets)
        self.opener = opener or urllib.request.build_opener(NoRedirect())
        self.budget = budget
        self.calls = 0

    def request(self, endpoint, params, secret_name, key_param):
        target = urllib.parse.urlsplit(endpoint)
        if target.scheme != 'https' or target.hostname not in HOSTS or target.query or target.fragment:
            raise SourceError('UNAPPROVED_ENDPOINT')
        if secret_name not in SECRET_NAMES or key_param not in ('serviceKey', 'KEY'):
            raise SourceError('INVALID_SECRET_CONTRACT')
        if self.calls >= self.budget:
            raise SourceError('REQUEST_BUDGET_EXCEEDED')
        self.calls += 1
        secret = self.secrets[secret_name]
        credential = data_go_key(secret) if secret_name == 'DATA_GO' else secret
        query = urllib.parse.urlencode({**params, key_param: credential})
        req = urllib.request.Request(endpoint + '?' + query, headers={'User-Agent': 'SideEconomyLab/decision-intelligence-v1'})
        try:
            with self.opener.open(req, timeout=45) as response:
                body = response.read(8_000_001)
            if len(body) > 8_000_000:
                raise SourceError('RESPONSE_BUDGET_EXCEEDED')
            try:
                return json.loads(body)
            except (json.JSONDecodeError, UnicodeDecodeError):
                # Official gateways may return XML even when JSON was requested.
                root = ET.fromstring(body)
                def convert(node):
                    if not list(node):
                        return node.text or ''
                    result = {}
                    for child in node:
                        key = child.tag.rsplit('}', 1)[-1]
                        val = convert(child)
                        if key in result:
                            result[key] = result[key] if isinstance(result[key], list) else [result[key]]
                            result[key].append(val)
                        else:
                            result[key] = val
                    return result
                return {root.tag.rsplit('}', 1)[-1]: convert(root)}
        except urllib.error.HTTPError as exc:
            raise SourceError('HTTP_' + str(exc.code)) from None
        except SourceError:
            raise
        except Exception:
            # Never stringify network exceptions, request objects, response bodies or URLs.
            raise SourceError('TRANSPORT_OR_PARSE_ERROR_' + type(__import__('sys').exception()).__name__) from None

    def data_go(self, operation, params):
        return self.request('https://apis.data.go.kr/' + operation, params, 'DATA_GO', 'serviceKey')

    def r_one(self, operation, params=None):
        return self.request('https://www.reb.or.kr/r-one/openapi/' + operation + '.do',
                            {'Type': 'json', 'pIndex': 1, 'pSize': 1000, **(params or {})}, 'R_ONE', 'KEY')

    def sanitize(self, value):
        return assert_sanitized(value, self.secrets.values())
