import pytest
from rest_framework.test import APIClient

from contas.models import Perfil, Utilizador
from pedidos.models import Pedido


@pytest.fixture(autouse=True)
def media_temporaria(settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path


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
    return Pedido.objects.create(
        autor=cliente, titulo="Exportar relatórios", problema="Hoje copiamos à mão para Excel."
    )
