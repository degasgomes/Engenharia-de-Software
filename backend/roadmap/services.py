"""Serviços de domínio do roadmap: Releases, Milestones e publicação."""

from django.db import transaction
from django.utils import timezone

from colaboracao.services import notificar_transicao
from pedidos.models import EstadoPedido
from requisitos.models import EstadoStory

# Uma story nestes estados já está a ser trabalhada.
ESTADOS_EM_CURSO = (EstadoStory.EM_PROGRESSO, EstadoStory.EM_REVISAO)


class ReleaseJaPublicada(Exception):
    """Uma Release publicada já não muda."""


def _garantir_aberta(release):
    if release.publicada:
        raise ReleaseJaPublicada(f"A release {release.nome} já foi publicada.")


def associar_pedido(release, pedido):
    """O pedido aprovado entra na Release e passa a Planeado; o cliente é avisado."""
    _garantir_aberta(release)
    pedido.planear(release)  # levanta TransicaoInvalida se não estiver Aprovado
    notificar_transicao(pedido)
    # Se a equipa já começou uma story antes de o pedido entrar na Release, o pedido não pode
    # ficar parado em Planeado: passa logo a Em Desenvolvimento e o cliente é avisado.
    if pedido.user_stories.filter(estado__in=ESTADOS_EM_CURSO).exists():
        pedido.iniciar_desenvolvimento()
        notificar_transicao(pedido)
    return pedido


def publicar(release):
    """Release.publicar() (EDS-13): os pedidos da Release passam a Lançado, com a data."""
    _garantir_aberta(release)
    agora = timezone.now()
    with transaction.atomic():
        pedidos = list(
            release.pedidos.filter(
                estado__in=(EstadoPedido.PLANEADO, EstadoPedido.EM_DESENVOLVIMENTO)
            )
        )
        for pedido in pedidos:
            pedido.lancar(agora)
        release.data_publicacao = agora
        release.save(update_fields=["data_publicacao"])
    for pedido in pedidos:
        pedido.release = release
        notificar_transicao(pedido)
    return release
