"""Serviços de domínio da colaboração: notificações na aplicação e por e-mail (US 2.3)."""

import logging

from contas.models import Utilizador
from pedidos.models import EstadoPedido

from .models import Notificacao
from .tasks import enviar_email

logger = logging.getLogger(__name__)

# US 2.3: só estas três passagens avisam o cliente. Aprovar e rejeitar não geram e-mail.
MENSAGENS = {
    EstadoPedido.PLANEADO: 'O pedido "{titulo}" foi planeado para a release {release}.',
    EstadoPedido.EM_DESENVOLVIMENTO: 'O pedido "{titulo}" entrou em desenvolvimento.',
    EstadoPedido.LANCADO: 'O pedido "{titulo}" foi lançado na release {release}.',
}


def por_na_fila(assunto, mensagem, destinatarios):
    """Entrega o e-mail ao Worker. Se a fila estiver em baixo, a operação principal continua."""
    try:
        enviar_email.delay(assunto, mensagem, list(destinatarios))
    except Exception:  # noqa: BLE001 - qualquer falha do broker
        logger.exception("Não foi possível pôr o e-mail na fila: %s", assunto)


def destinatarios_de(pedido):
    """Quem submeteu o pedido e quem votou nele, sem repetições."""
    return Utilizador.objects.filter(pk=pedido.autor_id) | Utilizador.objects.filter(
        votos__pedido=pedido
    )


def notificar_transicao(pedido):
    modelo = MENSAGENS.get(pedido.estado)
    if modelo is None:
        return []
    mensagem = modelo.format(
        titulo=pedido.titulo, release=pedido.release.nome if pedido.release_id else ""
    )
    utilizadores = list(destinatarios_de(pedido).distinct())
    notificacoes = Notificacao.objects.bulk_create(
        [Notificacao(utilizador=u, pedido=pedido, mensagem=mensagem) for u in utilizadores]
    )
    for utilizador in utilizadores:
        por_na_fila(
            f"{pedido.get_estado_display()}: {pedido.titulo}",
            f"Olá {utilizador.nome},\n\n{mensagem}\n\nFeatureFlow",
            [utilizador.email],
        )
    return notificacoes
