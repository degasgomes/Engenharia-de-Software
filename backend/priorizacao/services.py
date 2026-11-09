"""Serviços de domínio da priorização (EDS-10, camada 2)."""

from .models import Voto


class VotacaoFechada(Exception):
    """O pedido está REJEITADO ou LANCADO e já não aceita alterações de votos."""


def _garantir_votacao_aberta(pedido):
    if not pedido.aceita_votos:
        raise VotacaoFechada("Este pedido já não aceita alterações de votos.")


def votar(utilizador, pedido):
    """Insere o voto (passo 11 do Diagrama de Sequência 3). Devolve True se o voto é novo.

    Se o utilizador já tinha votado não acontece nada: a chave primária composta da
    tabela voto garante um voto por utilizador e pedido.
    """
    _garantir_votacao_aberta(pedido)
    _, criado = Voto.objects.get_or_create(utilizador=utilizador, pedido=pedido)
    return criado


def retirar_voto(utilizador, pedido):
    _garantir_votacao_aberta(pedido)
    Voto.objects.filter(utilizador=utilizador, pedido=pedido).delete()


def avaliar(pedido, esforco, impacto):
    pedido.esforco = esforco
    pedido.impacto = impacto
    pedido.save(update_fields=["esforco", "impacto"])
    return pedido
