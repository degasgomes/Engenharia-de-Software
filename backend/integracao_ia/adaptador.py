"""Adaptador do serviço de IA (ADR-003 e ADR-009).

O resto do sistema só conhece `gerar_esboco`. Trocar de fornecedor é trocar este ficheiro.
A função nunca levanta exceções: devolve `None` quando a IA falha, e quem chama decide o
que fazer (o Diagrama de Sequência 2 prevê 2 tentativas e depois a alternativa sem IA).
"""

import json
import logging

from django.conf import settings

logger = logging.getLogger(__name__)

ESQUEMA_ESBOCO = {
    "type": "object",
    "properties": {
        "descricao": {
            "type": "string",
            "description": "User Story no formato: Como <papel>, eu preciso de <o quê>, "
            "para que <benefício>.",
        },
        "criterios": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "dado": {"type": "string"},
                    "quando": {"type": "string"},
                    "entao": {"type": "string"},
                },
                "required": ["dado", "quando", "entao"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["descricao", "criterios"],
    "additionalProperties": False,
}

INSTRUCOES = (
    "És um analista de requisitos de uma equipa de produto. A partir de um pedido de "
    "funcionalidade feito por um cliente, escreve o esboço de uma User Story em português de "
    "Portugal, para o Gestor de Produto rever. A descrição segue o formato "
    '"Como <papel>, eu preciso de <o quê>, para que <benefício>." Junta 2 a 4 critérios de '
    "aceitação no formato Dado/Quando/Então, cada um verificável por um teste. Usa só o que "
    "está no pedido; não inventes requisitos que o cliente não pediu."
)


def _esboco_valido(dados):
    if not isinstance(dados, dict) or not str(dados.get("descricao", "")).strip():
        return None
    criterios = [
        {campo: str(c[campo]).strip() for campo in ("dado", "quando", "entao")}
        for c in dados.get("criterios") or []
        if all(str(c.get(campo, "")).strip() for campo in ("dado", "quando", "entao"))
    ]
    return {"descricao": dados["descricao"].strip(), "criterios": criterios}


def _gerar_falso(titulo, problema, anexos):
    """Esboço fixo, sem rede e sem custo: testes, CI e demonstrações sem chave."""
    return {
        "descricao": (
            f"Como cliente, eu preciso de {titulo[0].lower()}{titulo[1:]}, "
            "para que o problema descrito no pedido fique resolvido."
        ),
        "criterios": [
            {
                "dado": "que tenho sessão iniciada",
                "quando": f"uso a funcionalidade «{titulo}»",
                "entao": "o resultado aparece sem erros",
            }
        ],
    }


def _gerar_anthropic(titulo, problema, anexos):
    import anthropic

    cliente = anthropic.Anthropic(
        api_key=settings.ANTHROPIC_API_KEY,
        timeout=settings.IA_TIMEOUT_SEGUNDOS,
        # As tentativas são contadas por quem chama (no máximo 2, Diagrama de Sequência 2).
        max_retries=0,
    )
    pedido = f"Título: {titulo}\n\nProblema que resolve: {problema}"
    if anexos:
        pedido += "\n\nAnexos: " + ", ".join(anexos)
    try:
        resposta = cliente.beta.messages.create(
            model=settings.IA_MODELO,
            max_tokens=16000,
            system=INSTRUCOES,
            messages=[{"role": "user", "content": pedido}],
            output_config={
                "effort": "low",
                "format": {"type": "json_schema", "schema": ESQUEMA_ESBOCO},
            },
            # Se o modelo recusar o pedido, a API repete-o noutro modelo na mesma chamada.
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
        )
    except anthropic.APITimeoutError:
        logger.warning("A IA não respondeu em %s s.", settings.IA_TIMEOUT_SEGUNDOS)
        return None
    except anthropic.APIConnectionError:
        logger.warning("Sem ligação ao serviço de IA.")
        return None
    except anthropic.APIStatusError as erro:
        logger.warning("O serviço de IA respondeu %s.", erro.status_code)
        return None

    if resposta.stop_reason != "end_turn":  # refusal, max_tokens, …
        logger.warning("A IA parou com stop_reason=%s.", resposta.stop_reason)
        return None
    texto = next((b.text for b in resposta.content if b.type == "text"), "")
    try:
        return json.loads(texto)
    except json.JSONDecodeError:
        logger.warning("A IA devolveu um formato inválido.")
        return None


ADAPTADORES = {"falso": _gerar_falso, "anthropic": _gerar_anthropic}


def gerar_esboco(titulo, problema, anexos=()):
    """Devolve `{"descricao": str, "criterios": [{"dado", "quando", "entao"}]}` ou `None`."""
    gerar = ADAPTADORES[settings.IA_ADAPTADOR]
    return _esboco_valido(gerar(titulo, problema, list(anexos)))
