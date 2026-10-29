import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from pedidos.models import EstadoPedido, Pedido


@pytest.mark.parametrize("campo_em_falta", ["titulo", "problema"])
def test_submeter_sem_campo_obrigatorio_devolve_400(como, cliente, campo_em_falta):
    dados = {"titulo": "Modo escuro", "problema": "Cansa a vista à noite."}
    del dados[campo_em_falta]
    resposta = como(cliente).post("/api/v1/pedidos", dados, format="json")
    assert resposta.status_code == 400
    assert campo_em_falta in resposta.data
    assert Pedido.objects.count() == 0


def test_submeter_com_campo_so_com_espacos_devolve_400(como, cliente):
    resposta = como(cliente).post(
        "/api/v1/pedidos", {"titulo": "   ", "problema": "x"}, format="json"
    )
    assert resposta.status_code == 400


def test_submeter_pedido_fica_submetido_com_anexo_opcional(como, cliente):
    anexo = SimpleUploadedFile("ecra.png", b"conteudo", content_type="image/png")
    resposta = como(cliente).post(
        "/api/v1/pedidos",
        {"titulo": "Modo escuro", "problema": "Cansa a vista à noite.", "anexo": anexo},
        format="multipart",
    )
    assert resposta.status_code == 201
    assert resposta.data["estado"] == EstadoPedido.SUBMETIDO
    assert resposta.data["autor"] == "Sofia"
    assert resposta.data["anexos"][0]["nome_ficheiro"] == "ecra.png"


def test_lista_mostra_pedidos_de_todos(como, outro_cliente, pedido):
    resposta = como(outro_cliente).get("/api/v1/pedidos")
    assert resposta.status_code == 200
    assert [p["id"] for p in resposta.data] == [pedido.id]


def test_submeter_com_categoria_opcional(como, cliente):
    from pedidos.models import Categoria

    categoria = Categoria.objects.create(nome="Relatórios")
    api = como(cliente)
    assert api.get("/api/v1/categorias").data == [{"id": categoria.id, "nome": "Relatórios"}]
    resposta = api.post(
        "/api/v1/pedidos",
        {"titulo": "PDF", "problema": "Exportar.", "categoria": categoria.id},
        format="json",
    )
    assert resposta.status_code == 201
    assert resposta.data["categoria"] == "Relatórios"
    assert resposta.data["autor_id"] == cliente.id
