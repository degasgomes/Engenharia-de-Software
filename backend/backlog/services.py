"""Serviços de domínio do backlog: Sprints e Definition of Ready."""

from django.db.models import Max

from .models import Sprint


class StoryNaoPronta(Exception):
    """A story não cumpre a Definition of Ready (Diagrama de Sequência 4)."""


def criar_sprint(equipa, objetivo, data_inicio, data_fim):
    numero = (equipa.sprints.aggregate(m=Max("numero"))["m"] or 0) + 1
    return Sprint.objects.create(
        equipa=equipa, numero=numero, objetivo=objetivo, data_inicio=data_inicio, data_fim=data_fim
    )


def mover_para_sprint(sprint, story):
    """Entrar num Sprint exige estaPronta(); entrar não muda o estado da story."""
    if not story.esta_pronta():
        raise StoryNaoPronta(
            "A story não cumpre a Definition of Ready: falta pelo menos um critério de aceitação."
        )
    story.sprint = sprint
    campos = ["sprint"]
    # O responsável tem de ser da equipa do Sprint; se não for, a story entra sem responsável.
    if story.responsavel_id and not sprint.equipa.membros.filter(pk=story.responsavel_id).exists():
        story.responsavel = None
        campos.append("responsavel")
    story.save(update_fields=campos)
    return story


def retirar_do_sprint(sprint, story):
    if story.sprint_id == sprint.id:
        story.sprint = None
        story.save(update_fields=["sprint"])
    return story
