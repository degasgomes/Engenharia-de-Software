# FeatureFlow — Feature Request & Product Roadmap Management System

Fatia vertical do **Mini Sprint 3** (26–30/10): um Cliente regista-se, submete um pedido e
vota; um Gestor de Produto avalia e aprova esse pedido; tudo arranca com `docker compose up`.

## Arrancar

```bash
docker compose up --build
```

- Front-end: http://localhost:5173
- API: http://localhost:8000/api/v1/ (documentação OpenAPI em `/api/v1/docs`)
- Admin Django: http://localhost:8000/admin/

Na primeira execução são aplicadas as migrações e carregados os dados de exemplo
(`backend/fixtures/dados_exemplo.json`). Para voltar ao estado inicial:
`docker compose down -v && docker compose up`.

### Contas de demonstração

| Perfil | Email | Palavra-passe |
|---|---|---|
| Gestor de Produto (também admin) | `tiago@exemplo.pt` | `demo-gestor-2026` |
| Cliente | `sofia@exemplo.pt` | `demo-cliente-2026` |
| Cliente | `joao@exemplo.pt` | `demo-cliente-2026` |

O registo público cria sempre contas **Cliente**; os outros perfis atribuem-se no admin.

## Estrutura

```
backend/            Django + DRF (monólito modular, EDS-10)
  config/           settings e URLs (/api/v1/)
  contas/           Utilizador, Perfil, registo, JWT, permissões por perfil
  pedidos/          Pedido, Categoria, Anexo, EstadoPedido, aprovar()/rejeitar()
  priorizacao/      Voto (único por utilizador e pedido), serviços votar/avaliar
  fixtures/         dados de exemplo (loaddata)
  tests/            pytest
frontend/           React + Vite
  src/api.js        módulo único de pedidos à API
  src/pages/        Entrar, SubmeterPedido, ListaPedidos, DetalhePedido
docs/               artefactos dos sprints anteriores e ADR-008
```

## API (`/api/v1/`)

| Método | Endpoint | Quem | Descrição |
|---|---|---|---|
| POST | `/auth/registo` | público | cria Cliente |
| POST | `/auth/token` | público | login (`email`, `password`) → `access`, `refresh` |
| POST | `/auth/token/renovar` | público | renova o token de acesso |
| GET | `/auth/eu` | autenticado | utilizador atual |
| GET/POST | `/pedidos` | autenticado | listar (por votos) / submeter (multipart, `anexo` opcional) |
| GET | `/pedidos/{id}` | autenticado | detalhe |
| PATCH | `/pedidos/{id}` | Gestor | `esforco` e `impacto` (1–5) |
| POST | `/pedidos/{id}/aprovar` | Gestor | falha sem esforço e impacto |
| POST | `/pedidos/{id}/rejeitar` | Gestor | `justificacao` obrigatória |
| POST / DELETE | `/pedidos/{id}/votos` | autenticado | POST alterna (votar de novo retira), DELETE retira |

## Testes e lint (sem Docker)

```bash
python3 -m venv .venv && .venv/bin/pip install -r backend/requirements-dev.txt
cd backend && ../.venv/bin/pytest -q && ../.venv/bin/ruff check .
```

Sem `POSTGRES_DB` definido o back-end usa SQLite, o que chega para os testes locais; a CI
corre-os contra PostgreSQL.

```bash
cd frontend && npm install && npm run lint && npm run build
```

## Fluxo Git

- `main` e `develop` protegidas; uma branch por item: `feature/EDS-xx-descricao`.
- Commits com a chave do Jira (`EDS-xx: ...`), PR para `develop` com 1 revisor que não seja
  o autor, CI verde antes do merge (`.github/workflows/ci.yml`).
