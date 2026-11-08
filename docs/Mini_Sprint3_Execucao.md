# Mini Sprint 3 — Execução (26–30/10)

**Sprint Goal:** Um Cliente regista-se, submete um pedido e vota; um Gestor de Produto
avalia e aprova esse pedido; tudo a arrancar com `docker compose up`.

## Sprint Backlog e onde está no código

| ID | Item | SP | Código | Testes |
|---|---|---|---|---|
| M-01 | Modelos e migrações (Utilizador, Pedido, Categoria, Anexo, Voto) | 3 | `contas/models.py`, `pedidos/models.py`, `priorizacao/models.py`, `*/migrations/` | `test_base_de_dados_impede_voto_repetido` |
| M-02 | Registo, login JWT e perfis com permissões | 5 | `contas/` · `pages/Entrar.jsx`, `sessao.jsx` | `test_contas.py`, `test_cliente_nao_consegue_*` |
| M-03 | Submeter pedido (título e problema obrigatórios, anexo opcional) | 3 | `pedidos/serializers.py` · `pages/SubmeterPedido.jsx` | `test_submeter_*` |
| M-04 | Listar pedidos e votar / retirar voto | 5 | `priorizacao/services.py`, `pedidos/views.py` · `pages/ListaPedidos.jsx` | `test_nao_se_vota_duas_vezes_*`, `test_delete_retira_o_voto` |
| M-05 | Gestor define esforço e impacto, aprova ou rejeita com justificação | 5 | `Pedido.aprovar()/rejeitar()` · `pages/DetalhePedido.jsx` | `test_aprovar_falha_sem_esforco_ou_impacto`, `test_rejeitar_exige_justificacao` |
| M-06 | CI: lint e testes em cada PR | 2 | `.github/workflows/ci.yml` | — |
| M-07 | ADR-008 e dados de exemplo | 1 | `docs/adr/ADR-008-*.md`, `backend/fixtures/dados_exemplo.json` | passo "Dados de exemplo" da CI |

## Decisões tomadas durante a implementação

- **Triagem logo após a submissão.** No Diagrama de Estados 1 só se aprova ou rejeita a partir de
  EM_TRIAGEM, e no Diagrama de Sequência 1 é o Worker que conclui a triagem e envia o e-mail de
  confirmação. Enquanto o Worker não existe (Sprint 4), `pedidos/services.py` faz as duas coisas
  logo a seguir à submissão: envia o e-mail (caso de uso «include» do EDS-12) e conclui a triagem
  sem sugestões da IA (Submetido → Em Triagem). `aprovar()` e `rejeitar()` só aceitam EM_TRIAGEM.
- **Voto com chave primária composta** `(utilizador_id, pedido_id)`, como no EDS-14
  (`models.CompositePrimaryKey`, Django 5.2). Garante a restrição única pedida no guião. O Voto não
  aparece no admin do Django, que não suporta chaves compostas.
- **POST `/votos` insere, DELETE retira**, como no Diagrama de Sequência 3: POST responde
  201 Created (200 se o voto já existia) e DELETE 200 OK. A aplicação envia um ou outro
  consoante o utilizador já tenha votado, por isso clicar de novo retira o voto (guião 5.3).
- **Votação fechada** em pedidos REJEITADO ou LANCADO: votar ou retirar o voto devolve 403, como no
  Diagrama de Sequência 3 (`Pedido.aceita_votos`, `priorizacao/services.py`); o botão fica desativado.
- **Esforço e impacto numa escala de 1 a 5** (pronta para a matriz Esforço vs. Impacto).
- **Registo público cria só Clientes**: impede que alguém se registe como Gestor.
- **Palavras-passe com Argon2** (RNF-03); a coluna chama-se `password_hash` como no EDS-14.
- **`release_id` do Pedido** fica para o Sprint 4, com o módulo roadmap.
- **Interface segue os wireframes** (`docs/FeatureFlow – Wireframes.pdf`): menu lateral, topo
  com pesquisa e "+ Novo pedido". Estão funcionais Dashboard, Pedidos, Submeter pedido,
  Detalhe do pedido e Priorização (matriz, ranking e estimativa), sempre com dados reais.
  Backlog e Sprint, Roadmap, User Stories, Equipas e Notificações aparecem no menu com a
  indicação do sprint em que entram; tags, comentários e sugestões da IA também ficam de fora.
- **Score de priorização** = `100 × impacto × (6 − esforço) / 25`: alto impacto com baixo
  esforço dá perto de 100 (impacto 5, esforço 1 = 100).
- **Categoria opcional na submissão**, como no wireframe; a decisão 3.12 do EDS-13 prevê que
  seja confirmada pelo Gestor na triagem, por isso não é obrigatória.

## Ainda por fazer pela equipa (fora do código)

- [ ] Criar o repositório no GitHub, fazer push e proteger `main` e `develop`
      (Settings → Branches: exigir PR, 1 aprovação e o check "CI").
- [ ] Escolher SM e PO deste mini sprint; confirmar o ADR-008 e passar o estado a "Aceite".
- [ ] Criar o sprint no Jira com M-01…M-07, SP, responsáveis e subtarefas; ligar GitHub–Jira.
- [ ] Registar os dailies e as atas de Planning, Review e Retrospetiva.
- [ ] Guardar 2 exemplos de código gerado por IA em `docs/ia/` para a apresentação.
- [ ] Gravar o vídeo de reserva da demo.

## Guião da demo (5 min)

1. `docker compose up` e abrir http://localhost:5173.
2. **Registar** um Cliente novo → **Submeter pedido** (título, problema, anexo opcional).
3. Na lista, **votar** no pedido (o contador sobe; clicar de novo retira o voto).
4. **Sair** e entrar como `tiago@exemplo.pt` (Gestor).
5. Abrir o pedido → definir **esforço** e **impacto** → **Guardar avaliação** → **Aprovar**.
6. (Extra) Mostrar que "Aprovar" está desativado sem avaliação e que um Cliente não vê o painel.
