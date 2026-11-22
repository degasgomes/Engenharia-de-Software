from contas.models import Equipa

URL = "/api/v1/equipas"


def test_gestor_cria_equipa_e_junta_membros(como, gestor_projeto, programador):
    api = como(gestor_projeto)
    criada = api.post(URL, {"nome": "Equipa Beta"})
    assert criada.status_code == 201
    assert criada.data["membros"] == []

    com_membro = api.post(f"{URL}/{criada.data['id']}/membros", {"utilizador": programador.id})
    assert com_membro.status_code == 201
    assert [m["nome"] for m in com_membro.data["membros"]] == ["Rui"]

    # Juntar a mesma pessoa duas vezes não a duplica.
    api.post(f"{URL}/{criada.data['id']}/membros", {"utilizador": programador.id})
    assert Equipa.objects.get().membros.count() == 1


def test_nome_de_equipa_repetido_e_recusado(como, gestor_projeto, equipa):
    assert como(gestor_projeto).post(URL, {"nome": equipa.nome}).status_code == 400


def test_cliente_nao_entra_em_equipas(como, gestor_projeto, cliente, equipa):
    resposta = como(gestor_projeto).post(f"{URL}/{equipa.id}/membros", {"utilizador": cliente.id})
    assert resposta.status_code == 400


def test_retirar_membro(como, gestor_projeto, programador, equipa):
    api = como(gestor_projeto)
    resposta = api.delete(f"{URL}/{equipa.id}/membros/{programador.id}")
    assert resposta.status_code == 200
    assert [m["nome"] for m in resposta.data["membros"]] == ["Inês"]
    assert api.delete(f"{URL}/{equipa.id}/membros/{programador.id}").status_code == 404


def test_cliente_nao_cria_nem_ve_equipas(como, cliente):  # T-15
    api = como(cliente)
    assert api.post(URL, {"nome": "Intrusos"}).status_code == 403
    assert api.get(URL).status_code == 403
    assert api.get("/api/v1/utilizadores").status_code == 403


def test_lista_de_utilizadores_internos_nao_inclui_clientes(como, gestor, programador, cliente):
    resposta = como(gestor).get("/api/v1/utilizadores")
    assert [u["nome"] for u in resposta.data] == ["Rui", "Tiago"]
