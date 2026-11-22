// Módulo único para todos os pedidos à API (guião, secção 5.2).
const BASE = '/api/v1'
const CHAVE_TOKENS = 'featureflow.tokens'

export class ApiError extends Error {
  constructor(status, dados) {
    super(mensagemDeErro(dados))
    this.status = status
    this.dados = dados
  }
}

function mensagemDeErro(dados) {
  if (!dados) return 'Erro inesperado.'
  if (typeof dados === 'string') return dados
  if (dados.detail) return dados.detail
  return Object.entries(dados)
    .map(([campo, erros]) => `${campo}: ${[].concat(erros).join(' ')}`)
    .join('\n')
}

export function lerTokens() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_TOKENS))
  } catch {
    return null
  }
}

function guardarTokens(tokens) {
  if (tokens) localStorage.setItem(CHAVE_TOKENS, JSON.stringify(tokens))
  else localStorage.removeItem(CHAVE_TOKENS)
}

async function renovarToken() {
  const tokens = lerTokens()
  if (!tokens?.refresh) return false
  const resposta = await fetch(`${BASE}/auth/token/renovar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh: tokens.refresh }),
  })
  if (!resposta.ok) {
    guardarTokens(null)
    return false
  }
  const { access } = await resposta.json()
  guardarTokens({ ...tokens, access })
  return true
}

async function pedir(caminho, { method = 'GET', json, form, autenticado = true } = {}, tentarRenovar = true) {
  const headers = {}
  let body
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(json)
  } else if (form) {
    body = form
  }
  const tokens = lerTokens()
  if (autenticado && tokens?.access) headers.Authorization = `Bearer ${tokens.access}`

  const resposta = await fetch(`${BASE}${caminho}`, { method, headers, body })
  if (resposta.status === 401 && autenticado && tentarRenovar && (await renovarToken())) {
    return pedir(caminho, { method, json, form, autenticado }, false)
  }
  const dados = resposta.status === 204 ? null : await resposta.json().catch(() => null)
  if (!resposta.ok) throw new ApiError(resposta.status, dados)
  return dados
}

// --- autenticação -----------------------------------------------------------

export async function entrar(email, password) {
  const tokens = await pedir('/auth/token', { method: 'POST', json: { email, password }, autenticado: false })
  guardarTokens(tokens)
  return utilizadorAtual()
}

export async function registar({ nome, email, password }) {
  await pedir('/auth/registo', { method: 'POST', json: { nome, email, password }, autenticado: false })
  return entrar(email, password)
}

export function sair() {
  guardarTokens(null)
}

export const utilizadorAtual = () => pedir('/auth/eu')

// --- pedidos ----------------------------------------------------------------

export const listarPedidos = () => pedir('/pedidos')
export const obterPedido = (id) => pedir(`/pedidos/${id}`)

export const listarCategorias = () => pedir('/categorias')

export function submeterPedido({ titulo, problema, categoria, anexo }) {
  const form = new FormData()
  form.append('titulo', titulo)
  form.append('problema', problema)
  if (categoria) form.append('categoria', categoria)
  if (anexo) form.append('anexo', anexo)
  return pedir('/pedidos', { method: 'POST', form })
}

export const votar = (id) => pedir(`/pedidos/${id}/votos`, { method: 'POST' })
export const retirarVoto = (id) => pedir(`/pedidos/${id}/votos`, { method: 'DELETE' })

// Diagrama de Sequência 3: POST se ainda não votou, DELETE se já tinha votado.
export const alternarVoto = (pedido) => (pedido.votado ? retirarVoto(pedido.id) : votar(pedido.id))

export const avaliarPedido = (id, esforco, impacto) =>
  pedir(`/pedidos/${id}`, { method: 'PATCH', json: { esforco, impacto } })
export const aprovarPedido = (id) => pedir(`/pedidos/${id}/aprovar`, { method: 'POST' })
export const rejeitarPedido = (id, justificacao) =>
  pedir(`/pedidos/${id}/rejeitar`, { method: 'POST', json: { justificacao } })

// --- User Stories e Product Backlog (Sprint 4) ---------------------------------

export const listarUserStories = () => pedir('/user-stories')
export const criarUserStory = (descricao) => pedir('/user-stories', { method: 'POST', json: { descricao } })
export const editarUserStory = (id, dados) => pedir(`/user-stories/${id}`, { method: 'PATCH', json: dados })
export const apagarUserStory = (id) => pedir(`/user-stories/${id}`, { method: 'DELETE' })
export const acrescentarCriterio = (id, criterio) =>
  pedir(`/user-stories/${id}/criterios`, { method: 'POST', json: criterio })
export const retirarCriterio = (id, criterioId) =>
  pedir(`/user-stories/${id}/criterios/${criterioId}`, { method: 'DELETE' })
export const mudarEstadoStory = (id, estado) =>
  pedir(`/user-stories/${id}/estado`, { method: 'POST', json: { estado } })
export const moverNoBacklog = (id, direcao) =>
  pedir(`/user-stories/${id}/mover`, { method: 'POST', json: { direcao } })
// US 1.3: a IA escreve o esboço; o Gestor de Produto edita-o ou descarta-o.
export const gerarUserStory = (pedidoId) => pedir(`/pedidos/${pedidoId}/user-stories`, { method: 'POST' })

// --- Sprints -------------------------------------------------------------------

export const listarSprints = () => pedir('/sprints')
export const criarSprint = (dados) => pedir('/sprints', { method: 'POST', json: dados })
// Responde 422 se a story não cumprir a Definition of Ready.
export const moverParaSprint = (sprintId, storyId) =>
  pedir(`/sprints/${sprintId}/user-stories`, { method: 'POST', json: { user_story: storyId } })
export const retirarDoSprint = (sprintId, storyId) =>
  pedir(`/sprints/${sprintId}/user-stories/${storyId}`, { method: 'DELETE' })

// --- Equipas -------------------------------------------------------------------

export const listarEquipas = () => pedir('/equipas')
export const criarEquipa = (nome) => pedir('/equipas', { method: 'POST', json: { nome } })
export const juntarMembro = (equipaId, utilizador) =>
  pedir(`/equipas/${equipaId}/membros`, { method: 'POST', json: { utilizador } })
export const retirarMembro = (equipaId, utilizadorId) =>
  pedir(`/equipas/${equipaId}/membros/${utilizadorId}`, { method: 'DELETE' })
export const listarUtilizadoresInternos = () => pedir('/utilizadores')

// --- Roadmap -------------------------------------------------------------------

export const obterRoadmap = () => pedir('/roadmap')
export const criarRelease = (dados) => pedir('/releases', { method: 'POST', json: dados })
export const associarPedido = (releaseId, pedido) =>
  pedir(`/releases/${releaseId}/pedidos`, { method: 'POST', json: { pedido } })
export const criarMilestone = (releaseId, dados) =>
  pedir(`/releases/${releaseId}/milestones`, { method: 'POST', json: dados })
export const publicarRelease = (releaseId) => pedir(`/releases/${releaseId}/publicar`, { method: 'POST' })

// --- Notificações --------------------------------------------------------------

export const listarNotificacoes = () => pedir('/notificacoes')
export const marcarLida = (id) => pedir(`/notificacoes/${id}`, { method: 'PATCH', json: { lida: true } })
export const marcarTodasLidas = () => pedir('/notificacoes/marcar-todas', { method: 'POST' })
