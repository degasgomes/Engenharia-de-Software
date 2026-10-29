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
    assert primeiro.status_code == 200
    assert primeiro.data["total_votos"] == 1
    assert primeiro.data["votado"] is True

    segundo = api.post(url(pedido, "votos"))
    assert segundo.data["total_votos"] == 0
    assert segundo.data["votado"] is False
    assert Voto.objects.count() == 0


def test_delete_retira_o_voto(como, outro_cliente, pedido):
    api = como(outro_cliente)
    api.post(url(pedido, "votos"))
    resposta = api.delete(url(pedido, "votos"))
    assert resposta.data["total_votos"] == 0


def test_base_de_dados_impede_voto_repetido(outro_cliente, pedido):
    Voto.objects.create(utilizador=outro_cliente, pedido=pedido)
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
    assert pedido.estado == EstadoPedido.SUBMETIDO


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
    assert pedido.estado == EstadoPedido.SUBMETIDO
