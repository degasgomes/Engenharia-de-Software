"""Serviços de domínio dos requisitos: User Stories e critérios de aceitação."""

from django.conf import settings
from django.db import transaction
from django.db.models import Max

from colaboracao.services import notificar_transicao
from integracao_ia import adaptador
from pedidos.models import EstadoPedido

from .models import CriterioAceitacao, EstadoStory, UserStory


class PedidoNaoAprovado(Exception):
    """Só se geram User Stories de pedidos que o Gestor de Produto já aprovou."""


ESTADOS_COM_STORIES = (
    EstadoPedido.APROVADO,
    EstadoPedido.PLANEADO,
    EstadoPedido.EM_DESENVOLVIMENTO,
)


def proxima_ordem():
    """A story nova vai para o fim do Product Backlog."""
    return (UserStory.objects.aggregate(m=Max("ordem_backlog"))["m"] or 0) + 1


def criar_story(descricao, pedido=None, criterios=(), gerada_por_ia=False):
    with transaction.atomic():
        story = UserStory.objects.create(
            pedido=pedido,
            descricao=descricao,
            ordem_backlog=proxima_ordem(),
            gerada_por_ia=gerada_por_ia,
        )
        CriterioAceitacao.objects.bulk_create(
            [CriterioAceitacao(user_story=story, **c) for c in criterios]
        )
    return story


def gerar_user_story(pedido):
    """Diagrama de Sequência 2: até 2 tentativas com a IA; depois, a alternativa sem IA.

    A IA só sugere. O esboço fica em A Fazer, no fim do backlog, e o Gestor de Produto
    edita-o ou descarta-o.
    """
    if pedido.estado not in ESTADOS_COM_STORIES:
        raise PedidoNaoAprovado(
            f"Só um pedido aprovado gera User Stories; este está {pedido.get_estado_display()}."
        )
    anexos = list(pedido.anexos.values_list("nome_ficheiro", flat=True))
    esboco = None
    for _ in range(settings.IA_TENTATIVAS):
        esboco = adaptador.gerar_esboco(pedido.titulo, pedido.problema, anexos)
        if esboco:
            break
    if esboco:
        return criar_story(esboco["descricao"], pedido, esboco["criterios"], gerada_por_ia=True)
    # RNF-07: sem IA, a story nasce com a descrição original do pedido e sem critérios.
    return criar_story(f"{pedido.titulo}\n\n{pedido.problema}", pedido)


def mudar_estado(story, novo):
    """Move a story no quadro. A 1.ª story em Em Progresso põe o pedido em desenvolvimento."""
    with transaction.atomic():
        story.mudar_estado(novo)
        pedido = story.pedido
        arrancou = (
            novo == EstadoStory.EM_PROGRESSO
            and pedido is not None
            and pedido.estado == EstadoPedido.PLANEADO
        )
        if arrancou:
            pedido.iniciar_desenvolvimento()
    if arrancou:
        notificar_transicao(pedido)
    return story


def mover_no_backlog(story, direcao):
    """Troca a posição da story com a vizinha de cima ou de baixo no Product Backlog."""
    if direcao == "cima":
        vizinha = (
            UserStory.objects.filter(ordem_backlog__lt=story.ordem_backlog)
            .order_by("-ordem_backlog", "-id")
            .first()
        )
    else:
        vizinha = (
            UserStory.objects.filter(ordem_backlog__gt=story.ordem_backlog)
            .order_by("ordem_backlog", "id")
            .first()
        )
    if vizinha is None:
        return story
    with transaction.atomic():
        story.ordem_backlog, vizinha.ordem_backlog = vizinha.ordem_backlog, story.ordem_backlog
        story.save(update_fields=["ordem_backlog"])
        vizinha.save(update_fields=["ordem_backlog"])
    return story
