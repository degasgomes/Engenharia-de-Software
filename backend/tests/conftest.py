import pytest
from rest_framework.test import APIClient

from backlog.models import Sprint
from contas.models import Equipa, Perfil, Utilizador
from pedidos.models import EstadoPedido, Pedido
from requisitos.models import CriterioAceitacao, UserStory
from roadmap.models import Release


@pytest.fixture(autouse=True)
def media_temporaria(settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path


@pytest.fixture(autouse=True)
def worker_no_proprio_processo():
    """Os testes não dependem do Redis: as tarefas do Worker correm logo, mesmo no Docker."""
    from config.celery import app

    antes = app.conf.task_always_eager
    app.conf.task_always_eager = True
    yield
    app.conf.task_always_eager = antes


@pytest.fixture
def cliente(db):
    return Utilizador.objects.create_user("sofia@exemplo.pt", "Sofia", "senha-segura-123")


@pytest.fixture
def outro_cliente(db):
    return Utilizador.objects.create_user("joao@exemplo.pt", "João", "senha-segura-123")


@pytest.fixture
def gestor(db):
    return Utilizador.objects.create_user(
        "tiago@exemplo.pt", "Tiago", "senha-segura-123", perfil=Perfil.GESTOR_PRODUTO
    )


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def como(api):
    def autenticar(utilizador):
        api.force_authenticate(utilizador)
        return api

    return autenticar


@pytest.fixture
def pedido(cliente):
    """Um pedido que já passou pela triagem, pronto para o Gestor decidir."""
    return Pedido.objects.create(
        autor=cliente,
        titulo="Exportar relatórios",
        problema="Hoje copiamos à mão para Excel.",
        estado=EstadoPedido.EM_TRIAGEM,
    )


# --- Sprint 4 -----------------------------------------------------------------


@pytest.fixture
def gestor_projeto(db):
    return Utilizador.objects.create_user(
        "ines@exemplo.pt", "Inês", "senha-segura-123", perfil=Perfil.GESTOR_PROJETO
    )


@pytest.fixture
def programador(db):
    return Utilizador.objects.create_user(
        "rui@exemplo.pt", "Rui", "senha-segura-123", perfil=Perfil.PROGRAMADOR
    )


@pytest.fixture
def equipa(gestor_projeto, programador):
    equipa = Equipa.objects.create(nome="Equipa Alfa")
    equipa.membros.add(gestor_projeto, programador)
    return equipa


@pytest.fixture
def sprint(equipa):
    return Sprint.objects.create(
        equipa=equipa,
        numero=1,
        objetivo="Exportações",
        data_inicio="2026-11-16",
        data_fim="2026-11-27",
    )


@pytest.fixture
def pedido_aprovado(pedido):
    pedido.esforco, pedido.impacto = 2, 4
    pedido.save()
    pedido.aprovar()
    return pedido


@pytest.fixture
def release(db):
    return Release.objects.create(nome="v1.1", data_prevista="2026-12-01")


@pytest.fixture
def story(pedido_aprovado):
    """Uma User Story sem critérios: ainda não cumpre a Definition of Ready."""
    return UserStory.objects.create(
        pedido=pedido_aprovado, descricao="Como cliente, eu preciso de exportar.", ordem_backlog=1
    )


@pytest.fixture
def story_pronta(story):
    CriterioAceitacao.objects.create(
        user_story=story, dado="um relatório", quando="clico em Exportar", entao="recebo um .xlsx"
    )
    return story
