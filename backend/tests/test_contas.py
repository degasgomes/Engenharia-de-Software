from contas.models import Perfil, Utilizador


def test_registo_cria_sempre_cliente(api, db):
    resposta = api.post(
        "/api/v1/auth/registo",
        {
            "nome": "Ana",
            "email": "ana@exemplo.pt",
            "password": "uma-senha-longa-9",
            "perfil": Perfil.GESTOR_PRODUTO,
        },
        format="json",
    )
    assert resposta.status_code == 201
    assert resposta.data["perfil"] == Perfil.CLIENTE
    utilizador = Utilizador.objects.get(email="ana@exemplo.pt")
    assert utilizador.password.startswith("argon2")


def test_login_devolve_jwt_e_eu_identifica_utilizador(api, cliente):
    resposta = api.post(
        "/api/v1/auth/token",
        {"email": "sofia@exemplo.pt", "password": "senha-segura-123"},
        format="json",
    )
    assert resposta.status_code == 200
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {resposta.data['access']}")
    eu = api.get("/api/v1/auth/eu")
    assert eu.status_code == 200
    assert eu.data["email"] == "sofia@exemplo.pt"
    assert eu.data["perfil"] == Perfil.CLIENTE


def test_pedidos_exigem_autenticacao(api, db):
    assert api.get("/api/v1/pedidos").status_code == 401
