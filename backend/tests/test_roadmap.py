import pytest

from colaboracao.models import Notificacao
from pedidos.models import EstadoPedido, TransicaoInvalida
from priorizacao.models import Voto
from requisitos.models import EstadoStory, UserStory
from roadmap import services

URL = "/api/v1/releases"


# --- Releases e Milestones (S4-05) ----------------------------------------------


def test_gestor_cria_release_com_milestone(como, gestor):
    api = como(gestor)
    criada = api.post(URL, {"nome": "v2.0", "data_prevista": "2026-12-15"})
    assert criada.status_code == 201
    assert criada.data["publicada"] is False

    resposta = api.post(
        f"{URL}/{criada.data['id']}/milestones", {"nome": "Beta fechada", "data": "2026-12-01"}
    )
    assert resposta.status_code == 201
    assert resposta.data["milestones"][0]["nome"] == "Beta fechada"


def test_associar_pedido_aprovado_planeia_e_notifica(  # T-09
    como, gestor, cliente, outro_cliente, pedido_aprovado, release, mailoutbox
):
    Voto.objects.create(utilizador=outro_cliente, pedido=pedido_aprovado)
    Voto.objects.create(utilizador=cliente, pedido=pedido_aprovado)  # o autor também votou
    mailoutbox.clear()

    resposta = como(gestor).post(f"{URL}/{release.id}/pedidos", {"pedido": pedido_aprovado.id})

    assert resposta.status_code == 201
    assert resposta.data["pedidos"][0]["estado"] == "PLANEADO"
    pedido_aprovado.refresh_from_db()
    assert pedido_aprovado.release == release
    # Uma notificação e um e-mail por pessoa: o autor que também votou só recebe uma vez.
    assert Notificacao.objects.count() == 2
    assert sorted(m.to[0] for m in mailoutbox) == [outro_cliente.email, cliente.email]
    assert "foi planeado para a release v1.1" in mailoutbox[0].body


def test_pedido_por_aprovar_nao_entra_na_release(como, gestor, pedido, release):
    resposta = como(gestor).post(f"{URL}/{release.id}/pedidos", {"pedido": pedido.id})
    assert resposta.status_code == 400
    assert "Só um pedido Aprovado" in resposta.data["detail"]
    assert Notificacao.objects.count() == 0


def test_publicar_release_lanca_os_pedidos(  # T-10
    como, gestor, outro_cliente, pedido_aprovado, release, mailoutbox
):
    services.associar_pedido(release, pedido_aprovado)
    mailoutbox.clear()

    resposta = como(gestor).post(f"{URL}/{release.id}/publicar")

    assert resposta.status_code == 200
    assert resposta.data["publicada"] is True
    assert resposta.data["data_publicacao"] is not None
    pedido_aprovado.refresh_from_db()
    assert pedido_aprovado.estado == EstadoPedido.LANCADO
    assert pedido_aprovado.data_lancamento is not None
    assert "foi lançado na release v1.1" in mailoutbox[0].body
    # Num pedido Lançado a votação fecha (Diagrama de Sequência 3).
    voto = como(outro_cliente).post(f"/api/v1/pedidos/{pedido_aprovado.id}/votos")
    assert voto.status_code == 403


def test_release_publicada_ja_nao_muda(como, gestor, pedido_aprovado, release):  # T-11
    api = como(gestor)
    api.post(f"{URL}/{release.id}/publicar")

    de_novo = api.post(f"{URL}/{release.id}/publicar")
    assert de_novo.status_code == 400
    assert "já foi publicada" in de_novo.data["detail"]

    associar = api.post(f"{URL}/{release.id}/pedidos", {"pedido": pedido_aprovado.id})
    assert associar.status_code == 400
    pedido_aprovado.refresh_from_db()
    assert pedido_aprovado.estado == EstadoPedido.APROVADO


def test_roadmap_mostra_releases_com_pedidos_e_milestones(como, cliente, pedido_aprovado, release):
    release.milestones.create(nome="Beta", data="2026-11-20")
    services.associar_pedido(release, pedido_aprovado)

    resposta = como(cliente).get("/api/v1/roadmap")  # os Clientes veem o roadmap

    assert resposta.status_code == 200
    assert resposta.data[0]["nome"] == "v1.1"
    assert resposta.data[0]["pedidos"][0]["titulo"] == pedido_aprovado.titulo
    assert resposta.data[0]["milestones"][0]["nome"] == "Beta"


def test_o_pedido_mostra_a_release(como, cliente, pedido_aprovado, release):
    services.associar_pedido(release, pedido_aprovado)
    resposta = como(cliente).get(f"/api/v1/pedidos/{pedido_aprovado.id}")
    assert resposta.data["release_nome"] == "v1.1"
    assert resposta.data["estado_display"] == "Planeado"


# --- transições do Pedido (Diagrama de Estados 1) -------------------------------


def test_transicoes_do_pedido_fora_de_ordem_sao_recusadas(pedido, release):
    with pytest.raises(TransicaoInvalida):
        pedido.planear(release)  # ainda Em Triagem
    with pytest.raises(TransicaoInvalida):
        pedido.iniciar_desenvolvimento()
    with pytest.raises(TransicaoInvalida):
        pedido.lancar(None)


# --- permissões (T-15) ----------------------------------------------------------


def test_cliente_nao_gere_releases(como, cliente, release, pedido_aprovado):
    api = como(cliente)
    assert api.post(URL, {"nome": "v9", "data_prevista": "2026-12-01"}).status_code == 403
    assert api.post(f"{URL}/{release.id}/publicar").status_code == 403
    assert (
        api.post(f"{URL}/{release.id}/pedidos", {"pedido": pedido_aprovado.id}).status_code == 403
    )
    assert (
        api.post(f"{URL}/{release.id}/milestones", {"nome": "x", "data": "2026-12-01"}).status_code
        == 403
    )


# --- progresso da Release (EDS-13: Release.progresso()) --------------------------


def test_progresso_e_a_parte_das_stories_concluidas(como, cliente, pedido_aprovado, release, story):
    UserStory.objects.create(
        pedido=pedido_aprovado, descricao="Feita", ordem_backlog=2, estado=EstadoStory.CONCLUIDO
    )
    assert release.progresso() == 0.0  # ainda sem pedidos
    services.associar_pedido(release, pedido_aprovado)

    assert release.progresso() == 0.5
    assert como(cliente).get("/api/v1/roadmap").data[0]["progresso"] == 50


def test_release_publicada_esta_completa(pedido_aprovado, release, story):
    services.associar_pedido(release, pedido_aprovado)
    services.publicar(release)
    assert release.progresso() == 1.0


# --- pedido que já tem stories em curso quando entra na Release ------------------


def test_planear_pedido_com_story_em_curso_passa_logo_a_desenvolvimento(
    cliente, pedido_aprovado, release, story, mailoutbox
):
    story.mudar_estado(EstadoStory.EM_PROGRESSO)
    mailoutbox.clear()

    services.associar_pedido(release, pedido_aprovado)

    pedido_aprovado.refresh_from_db()
    assert pedido_aprovado.estado == EstadoPedido.EM_DESENVOLVIMENTO
    # O cliente é avisado das duas passagens, pela ordem certa.
    assert [m.subject.split(":")[0] for m in mailoutbox] == ["Planeado", "Em Desenvolvimento"]
    assert cliente.notificacoes.count() == 2
