"""Exemplo didático: OIDC -> OpenBao -> leitura KV, sem persistir credenciais."""

import json
import os
import ssl
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from urllib.request import HTTPRedirectHandler, HTTPSHandler, Request, build_opener


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def client(cafile=None):
    return build_opener(NoRedirect(), HTTPSHandler(context=ssl.create_default_context(cafile=cafile)))


def request(opener, url, *, payload=None, token=None, bearer=None):
    headers = {"Accept": "application/json"}
    if token:
        headers["X-Vault-Token"] = token
    if bearer:
        headers["Authorization"] = "Bearer " + bearer
    body = None
    if payload is not None:
        body = json.dumps(payload).encode()
        headers["Content-Type"] = "application/json"
    with opener.open(Request(url, data=body, headers=headers), timeout=20) as response:
        raw = response.read()
        return json.loads(raw) if raw else {}


def required(name):
    value = os.environ.get(name, "")
    if not value:
        raise ValueError("Configuração ausente: " + name)
    return value


def https_url(value):
    parsed = urlsplit(value)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password or parsed.fragment:
        raise ValueError("Endereço HTTPS inválido")
    return parsed


def run():
    addr = required("BAO_ADDR").rstrip("/")
    parsed_addr = https_url(addr)
    if parsed_addr.path or parsed_addr.query:
        raise ValueError("BAO_ADDR deve conter apenas origem HTTPS e porta")
    role = required("BAO_ROLE")
    audience = required("BAO_AUDIENCE")
    oidc = https_url(required("ACTIONS_ID_TOKEN_REQUEST_URL"))
    query = [(k, v) for k, v in parse_qsl(oidc.query) if k != "audience"]
    query.append(("audience", audience))
    oidc_url = urlunsplit(oidc._replace(query=urlencode(query)))
    # A CA privada do vault não substitui a confiança pública do emissor GitHub.
    github = client()
    bao = client(required("BAO_CACERT"))
    identity = request(github, oidc_url, bearer=required("ACTIONS_ID_TOKEN_REQUEST_TOKEN"))["value"]
    session = request(bao, addr + "/v1/auth/github/login", payload={"role": role, "jwt": identity})
    token = session["auth"]["client_token"]
    try:
        result = request(bao, addr + "/v1/secret/data/ci/laboratorio", token=token)
        secret = result["data"]["data"]["DEMO_TOKEN"]
        if not isinstance(secret, str) or not secret:
            raise ValueError("DEMO_TOKEN ausente ou inválido no KV")
        # Substituir esta validação pela chamada ao serviço autorizado.
        # Não colocar o segredo em argv, outputs, arquivos ou variáveis VITE_*.
        del secret, result
        print("Leitura do segredo concluída; valor não exibido nem persistido.")
        # Demonstra que a sessão não pode ler outro caminho.
        try:
            request(bao, addr + "/v1/secret/data/ci/nao-autorizado", token=token)
        except HTTPError as error:
            if error.code != 403:
                raise
            print("Menor privilégio confirmado: caminho adicional retornou HTTP 403.")
        else:
            raise ValueError("Política excessiva: leitura adicional não foi negada")
    finally:
        request(bao, addr + "/v1/auth/token/revoke-self", token=token, payload={})
        print("Sessão do OpenBao revogada.")


if __name__ == "__main__":
    try:
        run()
    except HTTPError as error:
        # Não registrar body, headers, URL ou conteúdo do JWT.
        print(f"Integração falhou: HTTP {error.code}. Consulte configuração e auditoria.", file=sys.stderr)
        sys.exit(1)
    except (URLError, OSError, ValueError, KeyError, TypeError):
        print("Integração falhou: verifique variáveis, CA, rede e formato da resposta.", file=sys.stderr)
        sys.exit(1)
