from backlog.models import Sprint

URL = "/api/v1/sprints"


def dados(equipa, **extra):
    return {
        "equipa": equipa.id,
        "objetivo": "Exportações",
        "data_inicio": "2026-11-16",
        "data_fim": "2026-11-27",
        **extra,
    }


# --- criar Sprints (S4-03) ------------------------------------------------------


def test_gestor_de_projeto_cria_sprints_numerados_por_equipa(como, gestor_projeto, equipa):
    api = como(gestor_projeto)
    primeiro = api.post(URL, dados(equipa))
    segundo = api.post(URL, dados(equipa, objetivo="Roadmap"))
    assert primeiro.status_code == 201
    assert (primeiro.data["numero"], segundo.data["numero"]) == (1, 2)
    assert primeiro.data["equipa_nome"] == "Equipa Alfa"
    assert primeiro.data["user_stories"] == []


def test_sprint_com_fim_antes_do_inicio_e_recusado(como, gestor_projeto, equipa):  # T-04
    resposta = como(gestor_projeto).post(URL, dados(equipa, data_fim="2026-11-01"))
    assert resposta.status_code == 400
    assert "data_fim" in resposta.data
    assert not Sprint.objects.exists()


# --- Definition of Ready (Diagrama de Sequência 4) -------------------------------


def test_story_sem_criterios_e_recusada_com_422(como, gestor_projeto, sprint, story):  # T-02
    resposta = como(gestor_projeto).post(
        f"{URL}/{sprint.id}/user-stories", {"user_story": story.id}
    )
    assert resposta.status_code == 422
    assert "Definition of Ready" in resposta.data["detail"]
    story.refresh_from_db()
    assert story.sprint is None


def test_story_com_um_criterio_entra_no_sprint(como, gestor_projeto, sprint, story_pronta):  # T-03
    story_pronta.story_points = 3
    story_pronta.save()
    resposta = como(gestor_projeto).post(
        f"{URL}/{sprint.id}/user-stories", {"user_story": story_pronta.id}
    )
    assert resposta.status_code == 201
    assert [s["id"] for s in resposta.data["user_stories"]] == [story_pronta.id]
    assert resposta.data["total_story_points"] == 3
    story_pronta.refresh_from_db()
    assert story_pronta.sprint == sprint
    assert story_pronta.estado == "A_FAZER"  # entrar no Sprint não muda o estado


def test_retirar_a_story_devolve_a_ao_product_backlog(como, gestor_projeto, sprint, story_pronta):
    api = como(gestor_projeto)
    api.post(f"{URL}/{sprint.id}/user-stories", {"user_story": story_pronta.id})
    resposta = api.delete(f"{URL}/{sprint.id}/user-stories/{story_pronta.id}")
    assert resposta.status_code == 200
    assert resposta.data["user_stories"] == []
    assert api.delete(f"{URL}/{sprint.id}/user-stories/{story_pronta.id}").status_code == 404


def test_story_que_nao_existe_e_recusada(como, gestor_projeto, sprint):
    resposta = como(gestor_projeto).post(f"{URL}/{sprint.id}/user-stories", {"user_story": 999})
    assert resposta.status_code == 400


# --- responsável (S4-04) --------------------------------------------------------


def test_responsavel_tem_de_ser_da_equipa_do_sprint(  # T-08
    como, gestor_projeto, gestor, programador, sprint, story_pronta
):
    api = como(gestor_projeto)
    api.post(f"{URL}/{sprint.id}/user-stories", {"user_story": story_pronta.id})
    caminho = f"/api/v1/user-stories/{story_pronta.id}"

    de_fora = api.patch(caminho, {"responsavel": gestor.id})
    assert de_fora.status_code == 400
    assert "não é membro da equipa Equipa Alfa" in de_fora.data["responsavel"][0]

    da_equipa = api.patch(caminho, {"responsavel": programador.id})
    assert da_equipa.status_code == 200
    assert da_equipa.data["responsavel_nome"] == "Rui"


def test_cliente_nao_pode_ser_responsavel(como, gestor_projeto, cliente, story):
    resposta = como(gestor_projeto).patch(
        f"/api/v1/user-stories/{story.id}", {"responsavel": cliente.id}
    )
    assert resposta.status_code == 400


def test_ao_entrar_no_sprint_sai_o_responsavel_de_outra_equipa(
    como, gestor_projeto, gestor, sprint, story_pronta
):
    story_pronta.responsavel = gestor  # não pertence à Equipa Alfa
    story_pronta.save()
    como(gestor_projeto).post(f"{URL}/{sprint.id}/user-stories", {"user_story": story_pronta.id})
    story_pronta.refresh_from_db()
    assert story_pronta.responsavel is None


# --- permissões (T-15) ----------------------------------------------------------


def test_cliente_nao_cria_nem_ve_sprints(como, cliente, equipa):
    api = como(cliente)
    assert api.post(URL, dados(equipa)).status_code == 403
    assert api.get(URL).status_code == 403


def test_programador_ve_os_sprints_mas_nao_os_planeia(como, programador, sprint, story_pronta):
    api = como(programador)
    assert api.get(f"{URL}/{sprint.id}").status_code == 200
    assert len(api.get(URL).data) == 1
    resposta = api.post(f"{URL}/{sprint.id}/user-stories", {"user_story": story_pronta.id})
    assert resposta.status_code == 403


# --- carga da equipa (métrica "Team workload") -----------------------------------


def test_sprint_mostra_a_capacidade_e_a_carga_de_cada_membro(
    como, gestor_projeto, programador, sprint, story_pronta
):
    programador.capacidade_sp = 8
    programador.save()
    story_pronta.story_points = 13
    story_pronta.sprint = sprint
    story_pronta.responsavel = programador
    story_pronta.save()

    resposta = como(gestor_projeto).get(f"{URL}/{sprint.id}")

    assert resposta.data["capacidade"] == 8  # a Inês não tem capacidade definida
    assert resposta.data["total_story_points"] == 13
    carga = {m["nome"]: (m["story_points"], m["capacidade_sp"]) for m in resposta.data["carga"]}
    assert carga == {"Inês": (0, 0), "Rui": (13, 8)}
