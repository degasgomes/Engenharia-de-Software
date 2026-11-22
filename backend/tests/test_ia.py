"""Gerar User Stories com IA (S4-02, Diagrama de Sequência 2). A IA real nunca é chamada."""

import pytest

from integracao_ia import adaptador
from requisitos.models import UserStory

ESBOCO = {
    "descricao": "Como analista, eu preciso de exportar para Excel, para que não copie à mão.",
    "criterios": [{"dado": "um relatório", "quando": "exporto", "entao": "recebo um .xlsx"}],
}


def url(pedido):
    return f"/api/v1/pedidos/{pedido.id}/user-stories"


@pytest.fixture
def ia(monkeypatch, settings):
    """Substitui o adaptador por uma lista de respostas e conta as chamadas."""
    chamadas = []

    def preparar(*respostas):
        fila = list(respostas)

        def falsa(titulo, problema, anexos):
            chamadas.append((titulo, problema, anexos))
            return fila.pop(0)

        monkeypatch.setitem(adaptador.ADAPTADORES, "teste", falsa)
        settings.IA_ADAPTADOR = "teste"
        return chamadas

    return preparar


def test_ia_devolve_esboco_valido(como, gestor, pedido_aprovado, ia, story):  # T-05
    chamadas = ia(ESBOCO)
    resposta = como(gestor).post(url(pedido_aprovado))

    assert resposta.status_code == 201
    assert resposta.data["descricao"] == ESBOCO["descricao"]
    assert resposta.data["gerada_por_ia"] is True
    assert resposta.data["estado"] == "A_FAZER"
    assert resposta.data["pronta"] is True
    assert resposta.data["criterios"][0]["entao"] == "recebo um .xlsx"
    assert resposta.data["ordem_backlog"] > story.ordem_backlog  # fim do backlog
    assert chamadas == [(pedido_aprovado.titulo, pedido_aprovado.problema, [])]


def test_ia_falha_a_primeira_e_acerta_a_segunda(como, gestor, pedido_aprovado, ia):
    chamadas = ia(None, ESBOCO)
    resposta = como(gestor).post(url(pedido_aprovado))
    assert resposta.data["gerada_por_ia"] is True
    assert len(chamadas) == 2


def test_ia_falha_duas_vezes_usa_a_descricao_original(como, gestor, pedido_aprovado, ia):  # T-06
    chamadas = ia(None, None, ESBOCO)
    resposta = como(gestor).post(url(pedido_aprovado))

    assert resposta.status_code == 201
    assert pedido_aprovado.titulo in resposta.data["descricao"]
    assert pedido_aprovado.problema in resposta.data["descricao"]
    assert resposta.data["criterios"] == []
    assert resposta.data["gerada_por_ia"] is False
    assert len(chamadas) == 2  # nunca há uma 3.ª chamada


@pytest.mark.parametrize(
    "invalido",
    [{"descricao": "", "criterios": []}, {"criterios": []}, "texto solto", []],
)
def test_formato_invalido_conta_como_falha(como, gestor, pedido_aprovado, ia, invalido):
    ia(invalido, invalido)
    resposta = como(gestor).post(url(pedido_aprovado))
    assert resposta.data["gerada_por_ia"] is False


def test_criterios_incompletos_da_ia_sao_ignorados(como, gestor, pedido_aprovado, ia):
    meio = {"dado": "x", "quando": "", "entao": "z"}
    ia({**ESBOCO, "criterios": [meio, ESBOCO["criterios"][0]]})
    resposta = como(gestor).post(url(pedido_aprovado))
    assert len(resposta.data["criterios"]) == 1


def test_pedido_nao_aprovado_nao_gera_story(como, gestor, pedido, ia):  # T-07
    chamadas = ia(ESBOCO)
    resposta = como(gestor).post(url(pedido))
    assert resposta.status_code == 400
    assert "Só um pedido aprovado" in resposta.data["detail"]
    assert chamadas == []
    assert not UserStory.objects.exists()


def test_so_o_gestor_de_produto_gera_stories(como, cliente, programador, pedido_aprovado):
    assert como(cliente).post(url(pedido_aprovado)).status_code == 403
    assert como(programador).post(url(pedido_aprovado)).status_code == 403


def test_adaptador_falso_devolve_um_esboco_no_formato_certo(settings):
    settings.IA_ADAPTADOR = "falso"
    esboco = adaptador.gerar_esboco("Exportar relatórios", "Copiamos à mão.")
    assert esboco["descricao"].startswith("Como cliente, eu preciso de exportar relatórios")
    assert set(esboco["criterios"][0]) == {"dado", "quando", "entao"}


def test_os_nomes_dos_anexos_vao_para_a_ia(como, gestor, pedido_aprovado, ia):
    pedido_aprovado.anexos.create(nome_ficheiro="exemplo.xlsx", ficheiro="anexos/exemplo.xlsx")
    chamadas = ia(ESBOCO)
    como(gestor).post(url(pedido_aprovado))
    assert chamadas[0][2] == ["exemplo.xlsx"]
