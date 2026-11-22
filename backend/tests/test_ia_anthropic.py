"""O adaptador real (ADR-009), com o SDK substituído: nenhum teste faz chamadas à rede."""

import json
import sys
import types

import pytest

from integracao_ia import adaptador


class _Erro(Exception):
    status_code = 529


@pytest.fixture
def sdk(monkeypatch, settings):
    """Um módulo `anthropic` de faz de conta que regista o pedido e devolve o que quisermos."""
    estado = types.SimpleNamespace(pedido=None, cliente=None, resposta=None, erro=None)

    def create(**kwargs):
        estado.pedido = kwargs
        if estado.erro:
            raise estado.erro
        return estado.resposta

    def Anthropic(**kwargs):
        estado.cliente = kwargs
        mensagens = types.SimpleNamespace(create=create)
        return types.SimpleNamespace(beta=types.SimpleNamespace(messages=mensagens))

    falso = types.ModuleType("anthropic")
    falso.Anthropic = Anthropic
    falso.APITimeoutError = type("APITimeoutError", (_Erro,), {})
    falso.APIConnectionError = type("APIConnectionError", (_Erro,), {})
    falso.APIStatusError = type("APIStatusError", (_Erro,), {})
    monkeypatch.setitem(sys.modules, "anthropic", falso)
    settings.IA_ADAPTADOR = "anthropic"
    settings.ANTHROPIC_API_KEY = "chave-de-teste"
    estado.modulo = falso
    return estado


def resposta(texto, stop_reason="end_turn"):
    bloco = types.SimpleNamespace(type="text", text=texto)
    return types.SimpleNamespace(stop_reason=stop_reason, content=[bloco])


ESBOCO = {
    "descricao": "Como cliente, eu preciso de X, para que Y.",
    "criterios": [{"dado": "a", "quando": "b", "entao": "c"}],
}


def test_pede_json_com_esquema_tempo_limite_e_sem_retries(sdk, settings):
    sdk.resposta = resposta(json.dumps(ESBOCO))
    esboco = adaptador.gerar_esboco("Título", "Problema", ["a.pdf"])

    assert esboco == ESBOCO
    assert sdk.cliente == {
        "api_key": "chave-de-teste",
        "timeout": settings.IA_TIMEOUT_SEGUNDOS,
        "max_retries": 0,
    }
    assert sdk.pedido["model"] == "claude-opus-5-5"
    assert sdk.pedido["output_config"]["format"]["schema"] == adaptador.ESQUEMA_ESBOCO
    conteudo = sdk.pedido["messages"][0]["content"]
    assert "Título" in conteudo and "Problema" in conteudo and "a.pdf" in conteudo


@pytest.mark.parametrize("erro", ["APITimeoutError", "APIConnectionError", "APIStatusError"])
def test_erros_da_api_devolvem_none(sdk, erro):
    sdk.erro = getattr(sdk.modulo, erro)()
    assert adaptador.gerar_esboco("Título", "Problema") is None


@pytest.mark.parametrize("stop_reason", ["refusal", "max_tokens"])
def test_resposta_incompleta_ou_recusada_devolve_none(sdk, stop_reason):
    sdk.resposta = resposta(json.dumps(ESBOCO), stop_reason)
    assert adaptador.gerar_esboco("Título", "Problema") is None


def test_json_invalido_devolve_none(sdk):
    sdk.resposta = resposta("isto não é JSON")
    assert adaptador.gerar_esboco("Título", "Problema") is None
