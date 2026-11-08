"""Serviços de domínio dos pedidos (EDS-10, camada 2).

O Diagrama de Sequência 1 põe estas duas tarefas na fila para o Worker (Celery). Enquanto o
Worker e a IA não existem (Sprint 4), correm logo a seguir à submissão: o e-mail de confirmação
é enviado e a triagem termina sem sugestões da IA, o caso "timeout ou erro da IA" do diagrama.
"""

from django.core.mail import send_mail

from .models import Pedido


def enviar_confirmacao(pedido: Pedido):
    """Caso de uso «include» Enviar confirmação por e-mail (EDS-12, Cliente)."""
    send_mail(
        subject=f"Pedido recebido: {pedido.titulo}",
        message=(
            f"Olá {pedido.autor.nome},\n\n"
            f'Recebemos o teu pedido "{pedido.titulo}". Vais ser avisado por e-mail quando '
            "ficar Planeado, Em Desenvolvimento e Lançado.\n\nFeatureFlow"
        ),
        from_email=None,
        recipient_list=[pedido.autor.email],
        # Uma falha no e-mail não pode anular uma submissão já guardada.
        fail_silently=True,
    )


def processar_submissao(pedido: Pedido):
    enviar_confirmacao(pedido)
    pedido.concluir_triagem(sugestoes=None)
