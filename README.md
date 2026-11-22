# FeatureFlow

**Feature Request & Product Roadmap Management System**, o projeto de Engenharia de Software da UBI (2026/27).

O FeatureFlow junta num só sítio os pedidos de funcionalidades dos clientes e transforma-os em
trabalho planeado:

1. um **Cliente** submete um pedido ("o que precisas?" e "que problema resolve?");
2. os outros clientes **votam** nos pedidos que também querem;
3. o **Gestor de Produto** avalia o esforço e o impacto e **aprova** ou **rejeita** o pedido;
4. os pedidos aprovados dão origem a **User Stories** (com um esboço escrito por IA), que entram
   em **Sprints**; os pedidos são planeados em **Releases** do roadmap e o cliente é avisado
   quando o pedido fica Planeado, Em Desenvolvimento e Lançado.

## Índice

- [Estado do projeto](#estado-do-projeto)
- [Como correr](#como-correr)
- [Contas de demonstração](#contas-de-demonstração)
- [Funcionalidades](#funcionalidades)
- [Arquitetura](#arquitetura)
- [Estrutura do repositório](#estrutura-do-repositório)
- [API](#api-apiv1)
- [Regras de negócio](#regras-de-negócio)
- [Testes e qualidade](#testes-e-qualidade)
- [Fluxo de trabalho](#fluxo-de-trabalho)

## Estado do projeto

| Sprint | Conteúdo | Estado |
|---|---|---|
| Mini Sprint 3 | Registo e login, submeter pedidos, votar, avaliar, aprovar e rejeitar | ✅ Concluído (na `main`) |
| Sprint 4 | Worker e Redis, User Stories geradas com IA, critérios de aceitação, Product Backlog e quadro de estados, Sprints e Definition of Ready, equipas, Releases e Milestones, roadmap, notificações | ✅ Concluído (branch `feature/sprint-4`) |
| Sprint 5 | Triagem com IA e duplicados, ligação a commits do GitHub, etiquetas, comentários, métricas | ⏳ Por fazer |

## Como correr

É preciso ter o [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado.

1. Clonar o repositório e entrar na pasta:

   ```bash
   git clone git@github.com:degasgomes/Engenharia-de-Software.git
   cd Engenharia-de-Software
   ```

2. Abrir o Docker, se ainda não estiver aberto. No macOS, espera até a baleia na barra de cima ficar parada:

   ```bash
   open -a Docker
   ```

3. Arrancar os cinco serviços (base de dados, Redis, back-end, Worker e front-end):

   ```bash
   docker compose up --build
   ```

   Deixa este terminal aberto. O sistema está pronto quando aparecer
   `Starting development server at http://0.0.0.0:8000/`.

4. Abrir o site em **http://localhost:5173** e entrar com uma das
   [contas de demonstração](#contas-de-demonstração).

| Serviço | Endereço |
|---|---|
| Aplicação web | http://localhost:5173 |
| API | http://localhost:8000/api/v1/ (sem login responde 401) |
| Documentação da API (OpenAPI) | http://localhost:8000/api/v1/docs |
| Admin do Django | http://localhost:8000/admin/ |

Na primeira execução, o back-end aplica as migrações e carrega os dados de exemplo
(`backend/fixtures/dados_exemplo.json`): 5 utilizadores, 1 equipa, 5 pedidos, 3 User Stories,
1 Sprint e 2 Releases.

Os e-mails não são enviados de verdade em desenvolvimento: aparecem no registo do Worker
(`docker compose logs worker`).

### Gerar User Stories com IA (opcional)

Sem configuração, o sistema usa um **adaptador falso**, que devolve um esboço fixo e não faz
chamadas à rede. Para usar a IA real (Claude, ADR-009), copia `.env.example` para `.env`, põe
a tua chave em `ANTHROPIC_API_KEY` e volta a arrancar. O `.env` não entra no Git.

### Parar e recomeçar

| Para… | Comando |
|---|---|
| Parar | `Ctrl+C` no terminal do `docker compose up`, ou `docker compose down` noutro terminal |
| Voltar aos dados de exemplo (apaga a base de dados) | `docker compose down -v` e depois `docker compose up --build` |

Se aparecer `port is already allocated`, o projeto já está a correr. Abre logo
http://localhost:5173 ou corre `docker compose down` antes de o arrancar de novo.

## Contas de demonstração

| Perfil | Email | Palavra-passe |
|---|---|---|
| Gestor de Produto (também admin do Django) | `tiago@exemplo.pt` | `demo-gestor-2026` |
| Cliente | `sofia@exemplo.pt` | `demo-cliente-2026` |
| Cliente | `joao@exemplo.pt` | `demo-cliente-2026` |
| Gestora de Projeto | `ines@exemplo.pt` | `demo-equipa-2026` |
| Programador | `rui@exemplo.pt` | `demo-equipa-2026` |

O registo público cria sempre contas de **Cliente**. Os outros perfis atribuem-se no admin do Django.

## Funcionalidades

### Cliente
- Criar conta, entrar e sair.
- Submeter um pedido com título, problema, categoria (opcional) e anexo (opcional, até 10 MB).
  Enquanto escreve, a aplicação mostra pedidos semelhantes, para evitar duplicados.
- Receber um e-mail de confirmação ao submeter. Em desenvolvimento, o e-mail aparece na consola do back-end.
- Ver todos os pedidos, pesquisar, filtrar por estado e por categoria, e ordenar.
- Votar e retirar o voto. Em pedidos rejeitados ou lançados já não se vota.
- Ver "Os meus pedidos", "Votados por mim" e o detalhe de cada pedido, incluindo a justificação
  quando é rejeitado.
- Ver o roadmap com as Releases e os Milestones.
- Receber uma notificação, na aplicação e por e-mail, quando um pedido que submeteu ou em que
  votou fica Planeado, Em Desenvolvimento ou Lançado.

### Gestor de Produto
- Tudo o que o Cliente faz.
- Definir o esforço e o impacto (de 1 a 5) e ver o score.
- Aprovar um pedido (só com a estimativa feita) ou rejeitá-lo com justificação.
- Usar a matriz Impacto × Esforço e o ranking dos pedidos por score.
- Consultar o Dashboard com os indicadores, os pedidos por estado, os mais votados e o progresso de cada Release.
- Gerar o esboço de uma User Story com IA a partir de um pedido aprovado, editá-lo ou descartá-lo.
- Escrever critérios de aceitação (Dado/Quando/Então) e ordenar o Product Backlog.
- Criar Releases e Milestones, associar pedidos aprovados e publicar a Release.

### Gestor de Projeto
- Criar equipas e Sprints.
- Mover User Stories para o Sprint. Uma story sem critérios de aceitação é recusada
  (Definition of Ready).
- Atribuir um responsável da equipa a cada story.
- Ver a carga da equipa: os Story Points do Sprint face à capacidade da equipa e de cada membro.

### Programador
- Ver o backlog e os Sprints e mover as stories no quadro (A Fazer → Em Progresso → Em Revisão →
  Concluído).

### Ecrãs

| Ecrã | Caminho | Para quê |
|---|---|---|
| Entrar / Criar conta | `/entrar` | Autenticação |
| Dashboard | `/` | Indicadores gerais |
| Pedidos | `/pedidos` | Lista com pesquisa, filtros e votos |
| Submeter pedido | `/pedidos/novo` | Formulário com pedidos semelhantes |
| Detalhe do pedido | `/pedidos/{id}` | Estado, votos, anexos e, para o Gestor, estimativa e decisão |
| Priorização | `/priorizacao` | Matriz Impacto × Esforço e ranking |

| User Stories | `/user-stories` | Gerar com IA, Product Backlog, critérios e quadro de estados |
| Backlog e Sprint | `/backlog` | Criar Sprints e mover stories com Definition of Ready |
| Roadmap | `/roadmap` | Roadmap visual (Gantt), Releases, Milestones e publicação |
| Equipas | `/equipas` | Equipas e membros |
| Notificações | `/notificacoes` | Avisos das mudanças de estado dos pedidos |

Os Clientes não veem User Stories, Backlog e Sprint nem Equipas.

A aplicação tem **modo claro e modo escuro**. O botão ☀️/🌙 do cabeçalho troca o tema e a escolha
fica guardada no browser; na primeira visita segue a preferência do sistema.

## Arquitetura

O sistema é **cliente-servidor em camadas**, com o back-end organizado como **monólito modular**
(ADR-001). As decisões de arquitetura estão registadas como ADRs.

```
 Utilizadores ──HTTPS──▶ Aplicação Web (React + Vite) ──REST/JSON──▶ API (Django + DRF) ──ORM──▶ PostgreSQL
                                                                         │            │
                                                                         │            └──▶ Serviço de IA (Claude)
                                                                         └──▶ Fila Redis ──▶ Worker Celery ──▶ E-mail
```

| Peça | Tecnologia |
|---|---|
| Front-end | React 18, Vite 5, React Router 6 |
| Back-end | Python 3.12, Django 5.2, Django REST Framework, SimpleJWT, drf-spectacular |
| Base de dados | PostgreSQL 16 (SQLite quando não há `POSTGRES_DB`, para testes locais) |
| Palavras-passe | Argon2 |
| Tarefas em segundo plano | Celery 5 com Redis 7 (ADR-004) |
| IA | API da Anthropic, modelo Claude Opus 5.5, atrás de um adaptador (ADR-003 e ADR-009) |
| Infraestrutura | Docker Compose, GitHub Actions |
| Qualidade | pytest, pytest-cov, ruff, ESLint, Vitest, React Testing Library |

No back-end há quatro camadas: a **API** (views, serializers e permissões), os **serviços de
domínio** (as regras de negócio), o **acesso a dados** (modelos e ORM) e os **adaptadores de
integração**. Os módulos falam uns com os outros só através de funções de serviço.

## Estrutura do repositório

```
backend/                Django + DRF
  config/               settings e URLs (/api/v1/)
  config/celery.py      configuração do Worker
  contas/               Utilizador, Perfil, Equipa, registo, JWT, permissões por perfil
  pedidos/              Pedido, Categoria, Anexo, estados e transições, triagem
  priorizacao/          Voto (chave primária composta utilizador+pedido), votar/avaliar
  requisitos/           UserStory, CriterioAceitacao, gerar com IA, quadro de estados
  backlog/              Sprint e Definition of Ready
  roadmap/              Release, Milestone, associar pedidos e publicar
  colaboracao/          Notificacao e a tarefa de e-mail do Worker
  integracao_ia/        adaptador do serviço de IA (real e falso)
  fixtures/             dados de exemplo
  tests/                testes pytest
  entrypoint.sh         migra a base de dados e carrega os dados de exemplo ao arrancar
frontend/               React + Vite
  src/api.js            módulo único de chamadas à API (tokens, renovação, endpoints)
  src/sessao.jsx        sessão do utilizador e perfil
  src/pages/            um ficheiro por ecrã
  src/gantt.js          cálculo do roadmap visual
  src/tema.js           modo claro e modo escuro
  src/testes/           testes Vitest
  src/estilos.css       estilos dos ecrãs (segundo os wireframes)
docker-compose.yml      serviços db, redis, backend, worker e frontend
.env.example            modelo do ficheiro .env (chave da IA)
.github/workflows/      CI
```

## API (`/api/v1/`)

Todos os endpoints, exceto os de autenticação, precisam do cabeçalho
`Authorization: Bearer <access>`.

| Método | Endpoint | Quem | Descrição |
|---|---|---|---|
| POST | `/auth/registo` | público | Cria uma conta de Cliente |
| POST | `/auth/token` | público | Login (`email`, `password`) → `access` e `refresh` |
| POST | `/auth/token/renovar` | público | Renova o token de acesso |
| GET | `/auth/eu` | autenticado | Dados do utilizador atual |
| GET | `/pedidos` | autenticado | Lista de pedidos, ordenada por votos |
| POST | `/pedidos` | autenticado | Submete um pedido (multipart, `anexo` opcional) → 201 |
| GET | `/pedidos/{id}` | autenticado | Detalhe de um pedido |
| PATCH | `/pedidos/{id}` | Gestor | Define `esforco` e `impacto` (1 a 5) |
| POST | `/pedidos/{id}/aprovar` | Gestor | Aprova; 400 sem esforço e impacto |
| POST | `/pedidos/{id}/rejeitar` | Gestor | Rejeita; `justificacao` obrigatória |
| POST | `/pedidos/{id}/votos` | autenticado | Vota → 201 (200 se já tinha votado) |
| DELETE | `/pedidos/{id}/votos` | autenticado | Retira o voto → 200 |
| GET | `/categorias` | autenticado | Lista de categorias |
| POST | `/pedidos/{id}/user-stories` | Gestor de Produto | Gera uma User Story com IA; 400 se o pedido não estiver aprovado |
| GET, POST | `/user-stories` | equipa / Gestores | Product Backlog; criar uma story manual |
| PATCH, DELETE | `/user-stories/{id}` | Gestores | Editar (descrição, Story Points, responsável) ou descartar |
| POST | `/user-stories/{id}/criterios` | Gestores | Acrescenta um critério Dado/Quando/Então |
| DELETE | `/user-stories/{id}/criterios/{cid}` | Gestores | Retira um critério |
| POST | `/user-stories/{id}/estado` | equipa | Move a story no quadro; 400 se saltar colunas |
| POST | `/user-stories/{id}/mover` | Gestores | Sobe ou desce a story no backlog |
| GET, POST | `/sprints` | equipa / Gestores | Lista e cria Sprints |
| POST | `/sprints/{id}/user-stories` | Gestores | Move uma story para o Sprint; **422** sem critérios |
| DELETE | `/sprints/{id}/user-stories/{sid}` | Gestores | Devolve a story ao Product Backlog |
| GET, POST | `/equipas` | equipa / Gestores | Lista e cria equipas |
| POST, DELETE | `/equipas/{id}/membros` | Gestores | Junta ou retira um membro |
| GET | `/roadmap` e `/releases` | autenticado | Releases com pedidos e Milestones |
| POST | `/releases` | Gestores | Cria uma Release |
| POST | `/releases/{id}/pedidos` | Gestores | Associa um pedido aprovado (passa a Planeado) |
| POST | `/releases/{id}/milestones` | Gestores | Cria um Milestone |
| POST | `/releases/{id}/publicar` | Gestores | Publica a Release (pedidos passam a Lançado) |
| GET | `/notificacoes` | autenticado | As notificações do próprio utilizador |
| PATCH | `/notificacoes/{id}` | autenticado | Marca como lida |
| POST | `/notificacoes/marcar-todas` | autenticado | Marca todas como lidas |

"Equipa" são todos os perfis menos o Cliente. "Gestores" são o Gestor de Produto e o Gestor de Projeto.

A documentação interativa está em http://localhost:8000/api/v1/docs.

## Regras de negócio

| Regra | Onde é garantida |
|---|---|
| Um voto por utilizador e pedido | Chave primária composta da tabela `voto` |
| Não se vota nem se retira o voto em pedidos Rejeitados ou Lançados (403) | `Pedido.aceita_votos`, `priorizacao/services.py` |
| Depois de submetido, o pedido recebe o e-mail de confirmação e passa a Em Triagem | `pedidos/services.py` |
| Só se aprova ou rejeita um pedido Em Triagem | `Pedido.aprovar()` e `Pedido.rejeitar()` |
| Aprovar exige esforço e impacto | `Pedido.aprovar()` |
| Rejeitar exige justificação | `Pedido.rejeitar()` |
| Só o Gestor de Produto avalia, aprova e rejeita | `contas/permissions.py` |
| Score = 100 × impacto × (6 − esforço) / 25 | `frontend/src/formatos.js` |
| A IA só sugere: no máximo 2 tentativas; se falhar, a story nasce com a descrição do pedido e sem critérios | `requisitos/services.py` |
| Definition of Ready: uma story só entra num Sprint com pelo menos um critério (422) | `UserStory.esta_pronta()`, `backlog/services.py` |
| O responsável por uma story tem de ser da equipa do Sprint | `requisitos/serializers.py` |
| Associar um pedido aprovado a uma Release passa-o a Planeado | `Pedido.planear()`, `roadmap/services.py` |
| A 1.ª story em Em Progresso passa o pedido Planeado a Em Desenvolvimento | `requisitos/services.py` |
| Publicar a Release passa os pedidos a Lançado e fecha a Release | `roadmap/services.py` |
| Se o pedido já tiver uma story em curso quando entra na Release, passa logo a Em Desenvolvimento | `roadmap/services.py` |
| Progresso de uma Release = User Stories concluídas / total (100% depois de publicada) | `Release.progresso()` |
| Só Planeado, Em Desenvolvimento e Lançado avisam o cliente (autor e votantes); aprovar e rejeitar não | `colaboracao/services.py` |
| O e-mail é enviado pelo Worker, nunca dentro do pedido HTTP | `colaboracao/tasks.py` |

Estados de um pedido: `SUBMETIDO` → `EM_TRIAGEM` → `APROVADO` ou `REJEITADO` → `PLANEADO` →
`EM_DESENVOLVIMENTO` → `LANCADO`.

Estados de uma User Story: `A_FAZER` → `EM_PROGRESSO` → `EM_REVISAO` → `CONCLUIDO`. A revisão
pode devolver a story a Em Progresso.

## Testes e qualidade

### Back-end (sem Docker)

```bash
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements-dev.txt
cd backend
../.venv/bin/pytest --cov --cov-fail-under=70
../.venv/bin/ruff check .
```

Sem a variável `POSTGRES_DB`, o back-end usa SQLite, o que chega para os testes locais. A CI
corre os mesmos testes contra PostgreSQL. Neste momento há 106 testes, com cerca de 97% de
cobertura do código da aplicação. Os testes nunca chamam a IA real nem precisam do Redis: usam
um adaptador falso e as tarefas do Worker correm no próprio processo.

### Front-end

```bash
cd frontend
npm install
npm run lint
npm test
npm run build
```

### Integração contínua

O workflow `.github/workflows/ci.yml` corre em cada pull request e em cada push para `main` e
`develop`:

- **Back-end:** ruff, verificação de migrações em falta, pytest em PostgreSQL com cobertura mínima de 70% (RNF-09) e carregamento dos dados de exemplo.
- **Front-end:** ESLint, testes Vitest (48 testes) e build.

## Fluxo de trabalho

- **Planeamento:** o trabalho é feito no Jira, no espaço "Engenharia de software", com chaves `EDS-xx`.
- **Branches:** a `main` é estável. Cada item tem a sua branch, `feature/EDS-xx-descricao`.
- **Commits:** levam a chave do Jira (`EDS-xx: ...`).
- **Pull requests:** todo o código entra por pull request, com a CI verde e revisão de alguém que não seja o autor.
- **Documentos:** os PDFs dos diagramas, os ADRs e as atas ficam fora deste repositório, que guarda só o código.
