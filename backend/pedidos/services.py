"""Serviços de domínio dos pedidos (EDS-10, camada 2).

Diagrama de Sequência 1: depois da submissão, o e-mail de confirmação vai para a fila do Worker
(Celery). A triagem com IA entra no Sprint 5; até lá termina sem sugestões, o caso
"timeout ou erro da IA" do diagrama.
"""

from colaboracao.services import por_na_fila

from .models import Pedido


def enviar_confirmacao(pedido: Pedido):
    """Caso de uso «include» Enviar confirmação por e-mail (EDS-12, Cliente)."""
    por_na_fila(
        f"Pedido recebido: {pedido.titulo}",
        (
            f"Olá {pedido.autor.nome},\n\n"
            f'Recebemos o teu pedido "{pedido.titulo}". Vais ser avisado por e-mail quando '
            "ficar Planeado, Em Desenvolvimento e Lançado.\n\nFeatureFlow"
        ),
        [pedido.autor.email],
    )


def processar_submissao(pedido: Pedido):
    enviar_confirmacao(pedido)
    pedido.concluir_triagem(sugestoes=None)
