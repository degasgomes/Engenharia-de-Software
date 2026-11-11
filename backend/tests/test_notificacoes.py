from colaboracao import services
from colaboracao.models import Notificacao

URL = "/api/v1/notificacoes"


def test_cada_um_ve_so_as_suas_notificacoes(como, cliente, outro_cliente):
    Notificacao.objects.create(utilizador=cliente, mensagem="Para a Sofia")
    Notificacao.objects.create(utilizador=outro_cliente, mensagem="Para o João")
    resposta = como(cliente).get(URL)
    assert [n["mensagem"] for n in resposta.data] == ["Para a Sofia"]
    assert resposta.data[0]["lida"] is False


def test_marcar_como_lida(como, cliente):
    notificacao = Notificacao.objects.create(utilizador=cliente, mensagem="Olá")
    resposta = como(cliente).patch(f"{URL}/{notificacao.id}", {"lida": True})
    assert resposta.status_code == 200
    assert resposta.data["lida"] is True
    assert resposta.data["mensagem"] == "Olá"


def test_nao_se_marca_a_notificacao_de_outra_pessoa(como, cliente, outro_cliente):  # T-14
    alheia = Notificacao.objects.create(utilizador=outro_cliente, mensagem="Privada")
    resposta = como(cliente).patch(f"{URL}/{alheia.id}", {"lida": True})
    assert resposta.status_code == 404
    alheia.refresh_from_db()
    assert alheia.lida is False


def test_marcar_todas_so_mexe_nas_minhas(como, cliente, outro_cliente):
    Notificacao.objects.create(utilizador=cliente, mensagem="A")
    Notificacao.objects.create(utilizador=cliente, mensagem="B")
    alheia = Notificacao.objects.create(utilizador=outro_cliente, mensagem="C")
    resposta = como(cliente).post(f"{URL}/marcar-todas")
    assert [n["lida"] for n in resposta.data] == [True, True]
    alheia.refresh_from_db()
    assert alheia.lida is False


def test_aprovar_e_rejeitar_nao_avisam_o_cliente(como, gestor, pedido, mailoutbox):  # T-13
    api = como(gestor)
    api.patch(f"/api/v1/pedidos/{pedido.id}", {"esforco": 2, "impacto": 4})
    assert api.post(f"/api/v1/pedidos/{pedido.id}/aprovar").status_code == 200
    assert mailoutbox == []
    assert Notificacao.objects.count() == 0
    assert services.notificar_transicao(pedido) == []  # Aprovado não é uma das 3 passagens


def test_rejeitar_nao_avisa_o_cliente(como, gestor, pedido, mailoutbox):
    como(gestor).post(f"/api/v1/pedidos/{pedido.id}/rejeitar", {"justificacao": "Fora do âmbito"})
    assert mailoutbox == []
    assert Notificacao.objects.count() == 0


def test_fila_em_baixo_nao_impede_a_operacao(monkeypatch, pedido_aprovado, release, caplog):
    from colaboracao.tasks import enviar_email
    from roadmap.services import associar_pedido

    def falhar(*args, **kwargs):
        raise ConnectionError("Redis em baixo")

    monkeypatch.setattr(enviar_email, "delay", falhar)
    associar_pedido(release, pedido_aprovado)

    pedido_aprovado.refresh_from_db()
    assert pedido_aprovado.estado == "PLANEADO"
    assert Notificacao.objects.count() == 1  # a notificação na aplicação fica guardada
    assert "Não foi possível pôr o e-mail na fila" in caplog.text
