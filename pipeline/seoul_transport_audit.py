"""Audit how the official Seoul Open API (openapi.seoul.go.kr) can be reached.

The service puts the authentication key in the URL PATH. Over plain HTTP that path is readable by
anyone on the network. This audit asks one question: does the official endpoint offer HTTPS whose
certificate verifies against the default trust store? It never uses a real credential: the portal's
public `sample` key is the only key in any request, and the script does not read the environment.
Certificate verification is never disabled. Output: public facts only (status, TLS version, certificate
subject/issuer/validity, whether the hostname matched).
"""
import argparse
import http.client
import json
import socket
import ssl
import sys

HOST = 'openapi.seoul.go.kr'
PATH = '/sample/json/VwsmSignguSelngW/1/1/'  # public sample key, one row
CASES = (
    ('https_8088_verified', 'https', 8088),
    ('https_443_verified', 'https', 443),
    ('http_8088_plain', 'http', 8088),
    ('http_80_plain', 'http', 80),
)


def name(parts):
    return ', '.join('='.join(x) for rdn in (parts or ()) for x in rdn)


def audit_case(label, scheme, port, timeout=15):
    out = {'case': label, 'scheme': scheme, 'host': HOST, 'port': port}
    try:
        if scheme == 'https':
            context = ssl.create_default_context()  # CERT_REQUIRED + hostname check, system CAs
            conn = http.client.HTTPSConnection(HOST, port, context=context, timeout=timeout)
        else:
            conn = http.client.HTTPConnection(HOST, port, timeout=timeout)
        conn.connect()
        if scheme == 'https':
            cert = conn.sock.getpeercert()
            out.update(tls_version=conn.sock.version(), cipher=conn.sock.cipher()[0], verified=True,
                       cert_subject=name(cert.get('subject')), cert_issuer=name(cert.get('issuer')),
                       cert_not_before=cert.get('notBefore'), cert_not_after=cert.get('notAfter'),
                       cert_san=[v for k, v in cert.get('subjectAltName', ()) if k == 'DNS'][:10])
        conn.request('GET', PATH, headers={'User-Agent': 'SideEconomyLab/transport-audit'})
        resp = conn.getresponse()
        body = resp.read(20000)
        out.update(status=resp.status, location=resp.getheader('Location'), content_type=resp.getheader('Content-Type'))
        try:
            payload = json.loads(body)
            block = next(iter(payload.values())) if isinstance(payload, dict) else {}
            result = (block.get('RESULT') or payload.get('RESULT') or {}) if isinstance(block, dict) else {}
            out.update(api_code=result.get('CODE'), api_rows=len(block.get('row', [])) if isinstance(block, dict) else None)
        except (ValueError, StopIteration, AttributeError):
            out.update(api_code=None, body_is_json=False)
        conn.close()
    except ssl.SSLCertVerificationError as exc:
        out.update(verified=False, error='CERTIFICATE_VERIFICATION_FAILED', verify_code=exc.verify_code, verify_message=exc.verify_message)
    except ssl.SSLError as exc:
        out.update(error='TLS_ERROR', detail=exc.reason or type(exc).__name__)
    except (socket.timeout, TimeoutError):
        out.update(error='TIMEOUT')
    except OSError as exc:
        out.update(error='CONNECTION_FAILED', detail=type(exc).__name__)
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--out')
    args = ap.parse_args()
    results = [audit_case(*case) for case in CASES]
    https = [r for r in results if r['scheme'] == 'https']
    ok = [r for r in https if r.get('verified') and r.get('api_code') == 'INFO-000']
    report = {'schema_version': 1, 'key_used': 'public sample key only', 'results': results,
              'verified_https_available': bool(ok), 'verified_https_endpoints': [f"{r['host']}:{r['port']}" for r in ok]}
    text = json.dumps(report, ensure_ascii=False, indent=1)
    if args.out:
        with open(args.out, 'w', encoding='utf-8') as f:
            f.write(text + '\n')
    print(text)
    return 0


if __name__ == '__main__':
    sys.exit(main())
