import pytest

from pedidos.models import EstadoPedido
from requisitos import services
from requisitos.models import EstadoStory, TransicaoStoryInvalida, UserStory

URL = "/api/v1/user-stories"
CRITERIO = {"dado": "um relatório", "quando": "clico em Exportar", "entao": "recebo um .xlsx"}


# --- User Stories e critérios (C-01) ------------------------------------------


def test_gestor_cria_user_story_no_fim_do_backlog(como, gestor, story):
    resposta = como(gestor).post(URL, {"descricao": "  Como gestor, eu preciso de filtros.  "})
    assert resposta.status_code == 201
    assert resposta.data["descricao"] == "Como gestor, eu preciso de filtros."
    assert resposta.data["estado"] == "A_FAZER"
    assert resposta.data["ordem_backlog"] == story.ordem_backlog + 1
    assert resposta.data["pronta"] is False


def test_user_story_sem_descricao_e_recusada(como, gestor):
    assert como(gestor).post(URL, {"descricao": "   "}).status_code == 400


@pytest.mark.parametrize("campo", ["dado", "quando", "entao"])
def test_criterio_exige_dado_quando_e_entao(como, gestor, story, campo):  # T-01
    incompleto = {**CRITERIO, campo: ""}
    resposta = como(gestor).post(f"{URL}/{story.id}/criterios", incompleto)
    assert resposta.status_code == 400
    assert campo in resposta.data
    assert story.criterios.count() == 0


def test_criterio_completo_deixa_a_story_pronta(como, gestor, story):
    resposta = como(gestor).post(f"{URL}/{story.id}/criterios", CRITERIO)
    assert resposta.status_code == 201
    assert resposta.data["pronta"] is True
    assert resposta.data["criterios"][0]["entao"] == "recebo um .xlsx"


def test_retirar_o_unico_criterio_deixa_a_story_por_preparar(como, gestor, story_pronta):
    criterio = story_pronta.criterios.get()
    resposta = como(gestor).delete(f"{URL}/{story_pronta.id}/criterios/{criterio.id}")
    assert resposta.status_code == 200
    assert resposta.data["pronta"] is False


def test_gestor_edita_e_descarta_o_esboco(como, gestor, story):
    api = como(gestor)
    editada = api.patch(f"{URL}/{story.id}", {"descricao": "Nova descrição", "story_points": 5})
    assert editada.status_code == 200
    assert editada.data["story_points"] == 5
    assert api.delete(f"{URL}/{story.id}").status_code == 204
    assert not UserStory.objects.exists()


def test_filtrar_as_stories_de_um_pedido(como, gestor, story):
    UserStory.objects.create(descricao="Story solta", ordem_backlog=2)
    resposta = como(gestor).get(URL, {"pedido": story.pedido_id})
    assert [s["id"] for s in resposta.data] == [story.id]
    assert resposta.data[0]["pedido_estado"] == "APROVADO"


def test_o_detalhe_do_pedido_mostra_as_suas_stories(como, cliente, story):
    resposta = como(cliente).get(f"/api/v1/pedidos/{story.pedido_id}")
    assert resposta.data["user_stories"] == [
        {"id": story.id, "descricao": story.descricao, "estado": "A Fazer"}
    ]


# --- Product Backlog ordenado e quadro de estados (C-02) ------------------------


def test_mover_no_backlog_troca_com_a_vizinha(como, gestor, story):
    segunda = UserStory.objects.create(descricao="Segunda", ordem_backlog=2)
    api = como(gestor)

    assert api.post(f"{URL}/{segunda.id}/mover", {"direcao": "cima"}).status_code == 200
    assert [s["id"] for s in api.get(URL).data] == [segunda.id, story.id]

    # A primeira já não sobe mais: fica onde está.
    api.post(f"{URL}/{segunda.id}/mover", {"direcao": "cima"})
    api.post(f"{URL}/{segunda.id}/mover", {"direcao": "baixo"})
    assert [s["id"] for s in api.get(URL).data] == [story.id, segunda.id]


def test_a_story_percorre_o_quadro_e_guarda_as_datas(como, programador, story):
    api = como(programador)
    for estado in ("EM_PROGRESSO", "EM_REVISAO", "CONCLUIDO"):
        resposta = api.post(f"{URL}/{story.id}/estado", {"estado": estado})
        assert resposta.status_code == 200
        assert resposta.data["estado"] == estado
    assert resposta.data["data_inicio"] is not None
    assert resposta.data["data_conclusao"] is not None


def test_a_story_nao_salta_colunas(como, programador, story):
    resposta = como(programador).post(f"{URL}/{story.id}/estado", {"estado": "CONCLUIDO"})
    assert resposta.status_code == 400
    assert "não pode passar a Concluído" in resposta.data["detail"]


def test_a_revisao_pode_devolver_a_story(story):
    story.mudar_estado(EstadoStory.EM_PROGRESSO)
    inicio = story.data_inicio
    story.mudar_estado(EstadoStory.EM_REVISAO)
    story.mudar_estado(EstadoStory.EM_PROGRESSO)
    assert story.data_inicio == inicio  # o início conta desde a primeira vez
    with pytest.raises(TransicaoStoryInvalida):
        story.mudar_estado(EstadoStory.CONCLUIDO)


# --- transição automática do pedido (S4-08) -------------------------------------


def test_primeira_story_em_progresso_muda_o_pedido(  # T-12
    como, programador, cliente, story, release, mailoutbox
):
    from roadmap.services import associar_pedido

    pedido = story.pedido
    associar_pedido(release, pedido)
    segunda = UserStory.objects.create(pedido=pedido, descricao="Segunda", ordem_backlog=2)
    mailoutbox.clear()
    api = como(programador)

    api.post(f"{URL}/{story.id}/estado", {"estado": "EM_PROGRESSO"})
    pedido.refresh_from_db()
    assert pedido.estado == EstadoPedido.EM_DESENVOLVIMENTO
    assert [m.to for m in mailoutbox] == [[cliente.email]]
    assert "entrou em desenvolvimento" in mailoutbox[0].body

    # A segunda story não volta a avisar ninguém.
    api.post(f"{URL}/{segunda.id}/estado", {"estado": "EM_PROGRESSO"})
    assert len(mailoutbox) == 1
    assert cliente.notificacoes.count() == 2  # Planeado + Em Desenvolvimento


def test_story_de_pedido_so_aprovado_nao_muda_o_pedido(story):
    services.mudar_estado(story, EstadoStory.EM_PROGRESSO)
    story.pedido.refresh_from_db()
    assert story.pedido.estado == EstadoPedido.APROVADO


# --- permissões (T-15, T-16) ----------------------------------------------------


def test_cliente_nao_ve_nem_altera_o_backlog(como, cliente, story):
    api = como(cliente)
    assert api.get(URL).status_code == 403
    assert api.post(URL, {"descricao": "x"}).status_code == 403
    assert api.post(f"{URL}/{story.id}/estado", {"estado": "EM_PROGRESSO"}).status_code == 403


def test_programador_ve_o_backlog_mas_nao_o_altera(como, programador, story):
    api = como(programador)
    assert api.get(URL).status_code == 200
    assert api.post(URL, {"descricao": "x"}).status_code == 403
    assert api.delete(f"{URL}/{story.id}").status_code == 403


def test_sem_sessao_responde_401(api):
    for caminho in ("user-stories", "sprints", "equipas", "releases", "roadmap", "notificacoes"):
        assert api.get(f"/api/v1/{caminho}").status_code == 401
