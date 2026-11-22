import pytest
from django.db import IntegrityError

from pedidos.models import EstadoPedido, TransicaoInvalida
from priorizacao.models import Voto


def url(pedido, acao=""):
    return f"/api/v1/pedidos/{pedido.id}" + (f"/{acao}" if acao else "")


# --- votos (PB 09) ---------------------------------------------------------


def test_nao_se_vota_duas_vezes_votar_de_novo_retira_o_voto(como, outro_cliente, pedido):
    api = como(outro_cliente)

    primeiro = api.post(url(pedido, "votos"))
    assert primeiro.status_code == 201  # Diagrama de Sequência 3, passo 15
    assert primeiro.data["total_votos"] == 1
    assert primeiro.data["votado"] is True

    segundo = api.post(url(pedido, "votos"))
    assert segundo.status_code == 200
    assert segundo.data["total_votos"] == 1
    assert Voto.objects.count() == 1

    # Clicar de novo no botão: a aplicação envia DELETE (Diagrama de Sequência 3, passo 3).
    terceiro = api.delete(url(pedido, "votos"))
    assert terceiro.status_code == 200
    assert terceiro.data["total_votos"] == 0
    assert Voto.objects.count() == 0


def test_delete_retira_o_voto(como, outro_cliente, pedido):
    api = como(outro_cliente)
    api.post(url(pedido, "votos"))
    resposta = api.delete(url(pedido, "votos"))
    assert resposta.status_code == 200
    assert resposta.data["total_votos"] == 0
    assert resposta.data["votado"] is False


def test_base_de_dados_impede_voto_repetido(outro_cliente, pedido):
    voto = Voto.objects.create(utilizador=outro_cliente, pedido=pedido)
    # EDS-14: a chave primária é composta por (utilizador_id, pedido_id)
    assert voto.pk == (outro_cliente.id, pedido.id)
    with pytest.raises(IntegrityError):
        Voto.objects.create(utilizador=outro_cliente, pedido=pedido)


def test_votos_de_utilizadores_diferentes_somam(como, cliente, outro_cliente, pedido):
    como(cliente).post(url(pedido, "votos"))
    resposta = como(outro_cliente).post(url(pedido, "votos"))
    assert resposta.data["total_votos"] == 2


# --- avaliação e aprovação (PB 07) ------------------------------------------


def test_aprovar_falha_sem_esforco_ou_impacto(pedido):
    with pytest.raises(TransicaoInvalida):
        pedido.aprovar()
    pedido.esforco = 3
    with pytest.raises(TransicaoInvalida):
        pedido.aprovar()
    pedido.refresh_from_db()
    assert pedido.estado == EstadoPedido.EM_TRIAGEM


@pytest.mark.parametrize("acao", ["aprovar", "rejeitar"])
def test_pedido_ainda_submetido_nao_pode_ser_decidido(pedido, acao):
    # Diagrama de Estados 1: aprovar() e rejeitar() só saem de Em Triagem.
    pedido.estado = EstadoPedido.SUBMETIDO
    pedido.esforco, pedido.impacto = 2, 4
    with pytest.raises(TransicaoInvalida):
        pedido.aprovar() if acao == "aprovar" else pedido.rejeitar("Fora da estratégia.")


def test_api_aprovar_sem_avaliacao_devolve_400(como, gestor, pedido):
    resposta = como(gestor).post(url(pedido, "aprovar"))
    assert resposta.status_code == 400


def test_gestor_avalia_e_aprova(como, gestor, pedido):
    api = como(gestor)
    avaliacao = api.patch(url(pedido), {"esforco": 2, "impacto": 5}, format="json")
    assert avaliacao.status_code == 200
    assert (avaliacao.data["esforco"], avaliacao.data["impacto"]) == (2, 5)

    resposta = api.post(url(pedido, "aprovar"))
    assert resposta.status_code == 200
    assert resposta.data["estado"] == EstadoPedido.APROVADO


def test_esforco_fora_da_escala_devolve_400(como, gestor, pedido):
    resposta = como(gestor).patch(url(pedido), {"esforco": 9, "impacto": 1}, format="json")
    assert resposta.status_code == 400


def test_rejeitar_exige_justificacao(como, gestor, pedido):
    api = como(gestor)
    assert (
        api.post(url(pedido, "rejeitar"), {"justificacao": " "}, format="json").status_code == 400
    )

    resposta = api.post(
        url(pedido, "rejeitar"), {"justificacao": "Fora da estratégia."}, format="json"
    )
    assert resposta.status_code == 200
    assert resposta.data["estado"] == EstadoPedido.REJEITADO
    assert resposta.data["justificacao_rejeicao"] == "Fora da estratégia."


def test_pedido_aprovado_nao_pode_ser_rejeitado(pedido):
    pedido.esforco, pedido.impacto = 1, 1
    pedido.aprovar()
    with pytest.raises(TransicaoInvalida):
        pedido.rejeitar("Mudámos de ideias.")


# --- permissões por perfil (ADR-005) ---------------------------------------


@pytest.mark.parametrize(
    "metodo, acao, dados",
    [
        ("post", "aprovar", None),
        ("post", "rejeitar", {"justificacao": "Não."}),
        ("patch", "", {"esforco": 1, "impacto": 1}),
    ],
)
def test_cliente_nao_consegue_avaliar_aprovar_ou_rejeitar(
    como, cliente, pedido, metodo, acao, dados
):
    pedido.esforco, pedido.impacto = 1, 1
    pedido.save()
    resposta = getattr(como(cliente), metodo)(url(pedido, acao), dados, format="json")
    assert resposta.status_code == 403
    pedido.refresh_from_db()
    assert pedido.estado == EstadoPedido.EM_TRIAGEM


# --- votação fechada (Diagrama de Sequência 3) -------------------------------


@pytest.mark.parametrize("estado", [EstadoPedido.REJEITADO, EstadoPedido.LANCADO])
@pytest.mark.parametrize("metodo", ["post", "delete"])
def test_pedido_terminado_nao_aceita_alteracoes_de_votos(
    como, outro_cliente, pedido, estado, metodo
):
    Voto.objects.create(utilizador=outro_cliente, pedido=pedido)
    pedido.estado = estado
    pedido.save()

    resposta = getattr(como(outro_cliente), metodo)(url(pedido, "votos"))

    assert resposta.status_code == 403
    assert "já não aceita" in resposta.data["detail"]
    assert Voto.objects.filter(pedido=pedido).count() == 1


def test_pedido_aprovado_continua_aberto_a_votos(como, outro_cliente, pedido):
    pedido.estado = EstadoPedido.APROVADO
    pedido.save()
    resposta = como(outro_cliente).post(url(pedido, "votos"))
    assert resposta.status_code == 201
    assert resposta.data["aceita_votos"] is True


def test_dados_de_exemplo_carregam_com_votos(db):
    from django.core.management import call_command

    from pedidos.models import Pedido

    call_command("loaddata", "dados_exemplo", verbosity=0)
    assert Voto.objects.count() == 5
    assert Pedido.objects.get(pk=3).total_votos() == 2
    # Sprint 4: equipa, sprint, release e User Stories para a demonstração
    planeado = Pedido.objects.get(pk=5)
    assert planeado.release.nome == "v1.1"
    assert planeado.user_stories.count() == 3
    assert planeado.user_stories.filter(sprint__numero=1).get().esta_pronta()
